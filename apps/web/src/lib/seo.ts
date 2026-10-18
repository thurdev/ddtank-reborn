import { useEffect } from "react";

export interface SeoOptions {
  title: string;
  description?: string;
  /** Absolute or root-relative path to the social preview image. Defaults to the DDTank Reborn logo. */
  image?: string;
}

const SITE_NAME = "DDTank Reborn";
const DEFAULT_IMAGE = "/play/logo.webp";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Sets <title> + description/og/twitter meta tags for the current page. No router-level head
 *  management lib in this app (TanStack Router's <HeadContent> would need a loader rewrite) — a
 *  plain effect is enough since every page here is a leaf route with a stable title. */
export function useSeo({ title, description, image }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`;
    document.title = fullTitle;
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:image", image ?? DEFAULT_IMAGE);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:image", image ?? DEFAULT_IMAGE);
  }, [title, description, image]);
}
