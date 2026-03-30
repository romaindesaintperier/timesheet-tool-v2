"""
Microsoft Entra ID JWT validation.
Validates tokens issued by Azure AD using JWKS (public keys).
"""
import httpx
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from .config import get_settings

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
    Validate the Bearer token from Microsoft Entra ID.
    Returns the decoded JWT claims (including preferred_username, name, oid, etc.).
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
    """Extract user email from validated JWT claims."""
    email = claims.get("preferred_username") or claims.get("email") or claims.get("upn")
    if not email:
        raise HTTPException(status_code=401, detail="Email not found in token")
    return email.lower()
