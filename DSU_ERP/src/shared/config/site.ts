export function siteOrigin() {
  const value =
    process.env.DSU_WEB_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:3000" : "");
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  )
    throw Error("Configure the canonical DSU_WEB_URL.");
  return url.origin;
}
