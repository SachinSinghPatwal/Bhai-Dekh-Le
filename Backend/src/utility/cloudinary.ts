import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import log from "./Logger.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadOptions {
  folder?: string;
  resource_type?: "auto" | "raw" | "image";
  filename_override?: string;
  public_id?: string;
}

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  options: CloudinaryUploadOptions = {},
): Promise<UploadApiResponse> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary credentials missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment.",
    );
  }

  const folder = options.folder ?? "bhaidekhle/resumes";
  const resourceType = options.resource_type ?? "raw";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        filename_override: options.filename_override,
        public_id: options.public_id,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          log.error("Cloudinary upload failed:", error);
          return reject(error);
        }
        if (!result) {
          return reject(new Error("Cloudinary returned empty upload response"));
        }
        log.info(`[Cloudinary] Successfully uploaded file to: ${result.secure_url}`);
        resolve(result);
      },
    );

    uploadStream.end(fileBuffer);
  });
}

export default cloudinary;
