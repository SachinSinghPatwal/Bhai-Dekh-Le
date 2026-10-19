export async function fetchCloudinaryPdf(
  pdfUrl: string,
): Promise<Buffer> {
  const url = new URL(pdfUrl);

  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com"
  ) {
    throw new Error("Invalid Cloudinary URL");
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  });

  if (!response.ok) {
    throw new Error(
      `Cloudinary PDF fetch failed: ${response.status}`,
    );
  }

  const contentType = response.headers.get("content-type");

  if (!contentType?.toLowerCase().includes("application/pdf")) {
    throw new Error("Cloudinary resource is not a PDF");
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  const maxBytes = 10 * 1024 * 1024;

  if (bytes.length > maxBytes) {
    throw new Error("PDF exceeds the 10 MB limit");
  }

  if (bytes.subarray(0, 5).toString() !== "%PDF-") {
    throw new Error("Invalid PDF file signature");
  }

  return bytes;
}

const Cloudinary = fetchCloudinaryPdf;
export { Cloudinary };
export default fetchCloudinaryPdf;