import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const missing = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "DSU_BACKEND_URL",
].filter((key) => !process.env[key] || process.env[key].includes("YOUR_"));
try {
  const auth = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const api = new URL(process.env.DSU_BACKEND_URL || "");
  const site = new URL(
    process.env.DSU_WEB_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:3000" : ""),
  );
  if (
    !["http:", "https:"].includes(site.protocol) ||
    site.pathname !== "/" ||
    site.username ||
    site.password ||
    site.search ||
    site.hash ||
    site.hostname.includes("your_")
  )
    missing.push("DSU_WEB_URL");
  if (
    !["https:", "http:"].includes(api.protocol) ||
    api.pathname !== "/" ||
    api.username ||
    api.password ||
    api.search ||
    api.hash
  )
    missing.push("DSU_BACKEND_URL");
  if (!["https:", "http:"].includes(auth.protocol))
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (process.env.NODE_ENV === "production") {
    if (api.protocol !== "https:") missing.push("DSU_BACKEND_URL");
    if (site.protocol !== "https:") missing.push("DSU_WEB_URL");
    if (
      Buffer.from(
        process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY || "",
        "base64",
      ).length !== 32
    )
      missing.push("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY");
  }
} catch {
  missing.push("URL configuration");
}
if (
  process.env.DATABASE_ADMIN_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
  missing.push("Remove database/service-role credentials from web runtime");
if (missing.length) {
  console.error("Check environment:", [...new Set(missing)].join(", "));
  process.exitCode = 1;
} else console.log("Web environment is valid. Values are not printed.");
