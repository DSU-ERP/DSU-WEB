export function backendOrigin(value = process.env.DSU_BACKEND_URL) {
  try {
    const url = new URL(value || "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw Error();
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw Error();
    return url;
  } catch { throw Error("DSU_BACKEND_URL must be a valid backend origin using HTTPS in production."); }
}

export function authConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw Error("Campus authentication is not configured.");
  return { url, key };
}
