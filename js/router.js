import { slugifyHash } from "./utils.js";

export function parseRoute(hash) {
  const raw = slugifyHash(hash || "#/home");
  if (raw.startsWith("detail/")) {
    return { page: "detail", slug: decodeURIComponent(raw.slice(7)) };
  }
  if (raw.startsWith("focus/")) {
    const page = raw.slice(6) || "home";
    return { page, slug: null, focus: true };
  }
  const page = raw || "home";
  return { page, slug: null, focus: false };
}
