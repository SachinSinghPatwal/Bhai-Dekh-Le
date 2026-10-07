import { NAUKRI_BASE_URL } from "../../../constants.js";

export default function ComposeUrl(
  path: string,
  query?: Record<string, string>,
): string {
  const url = new URL(path, `${NAUKRI_BASE_URL}/`);

  if (query) {
    url.search = new URLSearchParams(query).toString();
  }

  return url.toString();
}
