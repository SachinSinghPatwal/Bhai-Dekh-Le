import { BrowserContext } from "playwright";

export async function storeStateOfClient(context:BrowserContext) {
  await context.storageState({
    path: "../../../data/auth.encrypted.json",
  });
}
