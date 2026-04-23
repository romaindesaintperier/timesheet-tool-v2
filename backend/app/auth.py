"""
Authentication & Authorization

Identity Provider : Microsoft Entra ID (Azure AD v2.0)
OAuth Flow        : OAuth 2.1 Authorization Code Flow with PKCE (handled by MSAL on the SPA).
Token Type        : JWT access tokens, RS256-signed by Entra ID.
Validation        : Signature verified against Microsoft's published JWKS;
                    audience = our app's client_id; issuer = tenant v2.0 endpoint.

Authorization model
-------------------
- `validate_token`  : any authenticated Entra ID user (baseline).
- `get_user_email`  : same, plus extracts canonical user email from claims.
- `require_admin`   : authenticated user whose email is mapped to RoleEnum.admin
                      in the `user_roles` table. Returns HTTP 403 otherwise.
"""
import httpx
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from sqlalchemy.orm import Session
from .config import get_settings
from .database import get_db
from .models import UserRole, RoleEnum

security = HTTPBearer()

@lru_cache(maxsize=1)
def _get_jwks(tenant_id: str) -> dict:
    """Fetch Microsoft's public signing keys (cached)."""
    url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    resp = httpx.get(url)
    resp.raise_for_status()
    return resp.json()

def _get_signing_key(token: str, tenant_id: str) -> dict:
    """Find the correct signing key for the token's kid."""
    jwks = _get_jwks(tenant_id)
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    for key in jwks.get("keys", []):
        if key["kid"] == kid:
            return key
    raise HTTPException(status_code=401, detail="Unable to find signing key")

def validate_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Validate the Bearer JWT issued by Microsoft Entra ID.

    Verification steps:
      1. Resolve the signing key from the tenant's JWKS using the token's `kid`.
      2. Verify the RS256 signature.
      3. Enforce `aud` == our client_id and `iss` == tenant v2.0 issuer.
      4. Return the decoded claims (preferred_username, name, oid, etc.).
    """
    settings = get_settings()
    token = credentials.credentials

    if not settings.azure_tenant_id or not settings.azure_client_id:
        raise HTTPException(status_code=500, detail="Azure AD not configured")

    try:
        signing_key = _get_signing_key(token, settings.azure_tenant_id)
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.azure_client_id,
            issuer=f"https://login.microsoftonline.com/{settings.azure_tenant_id}/v2.0",
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )

def get_user_email(claims: dict = Depends(validate_token)) -> str:
    """Extract canonical user email from validated JWT claims."""
    email = claims.get("preferred_username") or claims.get("email") or claims.get("upn")
    if not email:
        raise HTTPException(status_code=401, detail="Email not found in token")
    return email.lower()

def require_admin(
    email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
) -> str:
    """
    Authorize the current user as an Admin.

    Looks up the email in the `user_roles` table. Returns the email if the
    user holds RoleEnum.admin; raises HTTP 403 otherwise.

    Use this dependency on every endpoint that mutates shared admin-managed
    resources (employees, codes, locations).
    """
    user_role = db.query(UserRole).filter(UserRole.email == email).first()
    if not user_role or user_role.role != RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return email
