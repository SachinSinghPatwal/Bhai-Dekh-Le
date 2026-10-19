import path from "node:path";
import {
  CLIENT_DATA_FOLDER_NAME,
  SnapShotsFileNamingConvention,
  encryption,
} from "../index.js";
import fs from "node:fs/promises";

interface CLIENT_DETAILS {
  username: string;
  password: string;
}

export default async function SaveUserData(data: CLIENT_DETAILS) {
  const { dateFolder } = SnapShotsFileNamingConvention();

  const dateDir = path.join(CLIENT_DATA_FOLDER_NAME, dateFolder);

  await fs.mkdir(dateDir, { recursive: true });

  const filePath = path.join(dateDir, "personalDetails.json.encrypted");

  const encryptedSnapshot = encryption(data);

  await fs.writeFile(
    filePath,
    JSON.stringify(encryptedSnapshot, null, 2),
    "utf-8",
  );
}

const saveSnapShots = SaveUserData;
export { saveSnapShots };
