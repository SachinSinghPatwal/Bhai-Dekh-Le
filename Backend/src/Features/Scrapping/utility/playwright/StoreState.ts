import { BrowserContext } from "playwright";

export async function StoreState(context: BrowserContext) {
  await context.storageState({
    path: "../../../data/auth.encrypted.json",
  });
}

const storeStateOfClient = StoreState;
export { storeStateOfClient };
export default StoreState;
