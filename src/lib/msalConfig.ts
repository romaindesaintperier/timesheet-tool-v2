/**
 * MSAL configuration for Microsoft Entra ID.
 *
 * Identity Provider : Microsoft Entra ID (Azure AD v2.0)
 * OAuth Flow        : OAuth 2.1 Authorization Code Flow with PKCE
 *                     (MSAL Browser performs the PKCE code_verifier/code_challenge
 *                      exchange automatically — do NOT switch to implicit flow).
 * Token storage     : sessionStorage (cleared on tab close, mitigates XSS persistence).
 */
import { Configuration, LogLevel } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || "";
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || "";
const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) console.error(message);
      },
      logLevel: LogLevel.Error,
    },
  },
};

// Scopes requested at sign-in. MSAL handles PKCE under the hood.
export const loginRequest = {
  scopes: ["User.Read", "openid", "profile", "email"],
};

