// Keeps <head> in step with client-side navigation. On a direct page load the
// server (backend/seo_pages.py) has already written the right tags, so these
// helpers only matter after an in-app route change.

function canonicalEl(): HTMLLinkElement | null {
  return document.querySelector('link[rel="canonical"]');
}

/** Absolute URL for a path on the site's canonical origin (taken from the server-written tag). */
export function canonicalUrl(path: string): string {
  const current = canonicalEl()?.href;
  const origin = current ? new URL(current).origin : window.location.origin;
  return origin + path;
}

export function isCanonical(path: string): boolean {
  return canonicalEl()?.href === canonicalUrl(path);
}

function setMeta(selector: string, content: string) {
  document.querySelector(selector)?.setAttribute("content", content);
}

export function setHead(opts: { path: string; title?: string; description?: string }) {
  const url = canonicalUrl(opts.path);
  canonicalEl()?.setAttribute("href", url);
  setMeta('meta[property="og:url"]', url);
  if (opts.title) {
    document.title = opts.title;
    setMeta('meta[property="og:title"]', opts.title);
    setMeta('meta[name="twitter:title"]', opts.title);
  }
  if (opts.description) {
    setMeta('meta[name="description"]', opts.description);
    setMeta('meta[property="og:description"]', opts.description);
    setMeta('meta[name="twitter:description"]', opts.description);
  }
}
