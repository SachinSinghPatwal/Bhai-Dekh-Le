import crypto from "node:crypto";
import fs from "node:fs/promises";

interface EncryptedSnapshot {
  iv: string;
  authTag: string;
  data: string;
}

export async function decryptSnapshot(filePath: string) {
  // Read encrypted JSON file
  const file = await fs.readFile(filePath, "utf8");

  const encrypted: EncryptedSnapshot = JSON.parse(file);

  // Get the same 256-bit key used during encryption
  const key = Buffer.from(process.env.SNAPSHOT_ENCRYPTION_KEY!, "hex");

  // Convert Base64 back into raw bytes
  const iv = Buffer.from(encrypted.iv, "base64");
  const authTag = Buffer.from(encrypted.authTag, "base64");
  const ciphertext = Buffer.from(encrypted.data, "base64");

  // Create AES-256-GCM decipher
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

  // Give GCM the authentication tag
  decipher.setAuthTag(authTag);

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  // Convert decrypted bytes back to JSON
  const jobs = JSON.parse(decrypted.toString("utf8"));

  return jobs;
}
