#!/usr/bin/env node

const baseUrl = (process.env.BASE_URL || process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
const strict = process.env.STRICT === "1" || process.argv.includes("--strict");

function unwrapTrpcResponse(payload) {
  return payload?.result?.data?.json ?? payload?.result?.data ?? payload;
}

function printItem(label, ok, detail = "") {
  const icon = ok ? "OK" : "FAIL";
  console.log(`${icon} ${label}${detail ? ` - ${detail}` : ""}`);
}

async function main() {
  const response = await fetch(`${baseUrl}/api/trpc/system.runtimeStatus`);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`runtimeStatus returned HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  const status = unwrapTrpcResponse(JSON.parse(text));
  const requirements = status.requirements ?? {};
  const database = status.database ?? {};

  console.log(`Runtime status for ${baseUrl}`);
  printItem("overall", Boolean(status.ok));
  printItem("DATABASE_URL configured", Boolean(database.configured));
  printItem("database connected", Boolean(database.connected));
  printItem("api_usage_logs migrated", Boolean(database.apiUsageLogsMigrated));
  printItem("JWT_SECRET configured", Boolean(requirements.jwtSecret));
  printItem("VITE_APP_ID configured", Boolean(requirements.appId));
  printItem("VITE_OAUTH_PORTAL_URL configured", Boolean(requirements.oauthPortalUrl));
  printItem("OAUTH_SERVER_URL configured", Boolean(requirements.oauthServerUrl));
  printItem("ADMIN_PASSWORD configured", Boolean(requirements.adminPassword));
  printItem("OAuth login ready", Boolean(requirements.oauthReady));
  printItem("admin password login ready", Boolean(requirements.adminPasswordLoginReady));
  printItem("Forge URL configured (optional)", Boolean(requirements.forgeApiUrl));
  printItem("Forge API key configured (optional)", Boolean(requirements.forgeApiKey));
  printItem("login ready", Boolean(requirements.loginReady));
  printItem("AI ready (optional)", Boolean(requirements.aiReady));

  if (database.error) {
    console.log(`Database detail: ${database.error}`);
  }

  if (strict && !status.ok) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
