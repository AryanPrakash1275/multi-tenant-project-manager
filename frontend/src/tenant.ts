const KEY = "org_slug";

export function getOrgSlug() {
  return localStorage.getItem(KEY) || "";
}

export function setOrgSlug(slug: string) {
  localStorage.setItem(KEY, slug);
}

export function clearOrgSlug() {
  localStorage.removeItem(KEY);
}
