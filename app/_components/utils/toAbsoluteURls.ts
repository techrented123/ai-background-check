// utils/url.ts
export function toAbsoluteUrl(raw?: string): string {
  if (!raw) return "";
  const s = raw.trim();

  // already absolute or special schemes
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;

  // protocol-relative like //linkedin.com/in/...
  if (s.startsWith("//")) return "https:" + s;

  // make absolute; also strip extra leading slashes to avoid https:////
  return "https://" + s.replace(/^\/+/, "");
}
