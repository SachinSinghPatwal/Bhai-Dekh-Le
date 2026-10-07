// Remove HTTP/2 pseudo-headers:
// :authority, :method, :path, :scheme

export function sanitizeCaptureHeaderUrl(
  capturedHeaders: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(capturedHeaders).filter(([name]) => !name.startsWith(":")),
  );
}
