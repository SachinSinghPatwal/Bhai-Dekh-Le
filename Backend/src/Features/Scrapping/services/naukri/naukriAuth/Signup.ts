import { BrowserContext, Page } from "playwright";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  typeIntoField,
  clickButton,
  CLIENT_DATA_PATH,
  JOB_AUTH_URL,
  AUTH_SELECTORS,
  ComposeUrl,
  log,
  encrypt,
} from "../../../index.js";
