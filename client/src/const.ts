import { API_BASE_URL } from "@/lib/api";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  
  if (!oauthPortalUrl) {
    console.warn("[OAuth] VITE_OAUTH_PORTAL_URL is not configured. OAuth login will not work.");
    return "#";
  }
  
  if (!appId) {
    console.warn("[OAuth] VITE_APP_ID is not configured. OAuth login will not work.");
    return "#";
  }
  
  const apiOrigin = API_BASE_URL || window.location.origin;
  const redirectUri = `${apiOrigin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    console.error("[OAuth] Failed to create login URL:", error);
    return "#";
  }
};
