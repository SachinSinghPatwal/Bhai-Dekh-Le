import path from "node:path";
import { CLIENT_DATA_FOLDER_NAME } from "../../../constants.js";
import { getFileFolderNamingConvention } from "../index.js";
import fs from "node:fs/promises";
import { encrypt } from "../../../utility/crypto/encryption.js";

interface CLIENT_DETAILS {
  username: string;
  password: string;
}

export default async function saveSnapShots(data: CLIENT_DETAILS) {
  const { dateFolder } = getFileFolderNamingConvention();

  const dateDir = path.join(CLIENT_DATA_FOLDER_NAME, dateFolder);

  await fs.mkdir(dateDir, { recursive: true });

  const filePath = path.join(dateDir, "personalDetails.json.encrypted");

  const encryptedSnapshot = encrypt(data);

  await fs.writeFile(
    filePath,
    JSON.stringify(encryptedSnapshot, null, 2),
    "utf-8",
  );
}
