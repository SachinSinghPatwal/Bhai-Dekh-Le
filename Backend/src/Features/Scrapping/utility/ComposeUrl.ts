export default function ComposeUrl(
  path: string,
  BaseUrl:string,
  query?: Record<string, any>,
): string {
  const url = new URL(path, `${BaseUrl}/`);

  if (query) {
    url.search = new URLSearchParams(query).toString();
  }

  return url.toString();
}
