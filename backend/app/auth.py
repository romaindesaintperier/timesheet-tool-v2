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
- `is_admin`        : pure helper — does this email have RoleEnum.admin?
- `require_admin`   : authenticated user whose email is mapped to RoleEnum.admin
                      in the `user_roles` table. Returns HTTP 403 otherwise.

JWKS cache
----------
Microsoft rotates the signing keys periodically. We cache the key set with a
TTL and additionally refetch on-demand whenever a token's `kid` is not present
in the cached set, so legitimate post-rotation tokens never see false 401s.
"""
import time
import threading
import httpx
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .config import get_settings
from .database import get_db
from .models import UserRole, RoleEnum

security = HTTPBearer()

# ── JWKS cache (TTL + kid-miss refresh) ──
_JWKS_TTL_SECONDS = 60 * 60  # refresh hourly under normal operation
_jwks_lock = threading.Lock()
_jwks_cache: dict = {"tenant_id": None, "data": None, "fetched_at": 0.0}


def _fetch_jwks(tenant_id: str) -> dict:
    """Network call — fetches Microsoft's public signing keys."""
    url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    resp = httpx.get(url, timeout=10.0)
    resp.raise_for_status()
    return resp.json()


def _get_jwks(tenant_id: str, force_refresh: bool = False) -> dict:
    """Return cached JWKS, refetching when stale, when the tenant changes,
    or when the caller explicitly requests a refresh (e.g. unknown `kid`)."""
    now = time.time()
    with _jwks_lock:
        if (
            not force_refresh
            and _jwks_cache["data"] is not None
            and _jwks_cache["tenant_id"] == tenant_id
            and (now - _jwks_cache["fetched_at"]) < _JWKS_TTL_SECONDS
        ):
            return _jwks_cache["data"]
        data = _fetch_jwks(tenant_id)
        _jwks_cache["tenant_id"] = tenant_id
        _jwks_cache["data"] = data
        _jwks_cache["fetched_at"] = now
        return data


def _get_signing_key(token: str, tenant_id: str) -> dict:
    """Find the correct signing key for the token's `kid`.
    On a kid-miss, force a JWKS refresh once before giving up — this covers
    Microsoft's key rotation events."""
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    for attempt in (False, True):  # second attempt forces a JWKS refresh
        jwks = _get_jwks(tenant_id, force_refresh=attempt)
        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                return key
    raise HTTPException(status_code=401, detail="Unable to find signing key")


def validate_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Validate the Bearer JWT issued by Microsoft Entra ID.

    Verification steps:
      1. Resolve the signing key from the tenant's JWKS using the token's `kid`
         (with a TTL cache and a kid-miss refresh to handle rotation).
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


def is_admin(email: str, db: Session) -> bool:
    """Pure helper: does this email hold RoleEnum.admin? Never raises."""
    user_role = db.query(UserRole).filter(UserRole.email == email).first()
    return bool(user_role and user_role.role == RoleEnum.admin)


def require_admin(
    email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
) -> str:
    """
    Authorize the current user as an Admin.

    Looks up the email in the `user_roles` table. Returns the email if the
    user holds RoleEnum.admin; raises HTTP 403 otherwise.
    """
    if not is_admin(email, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return email
