import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const DATASET_DIR = join(ROOT, "dataset");
export const CSV_PATH = join(DATASET_DIR, "items.csv");
export const PROMPTS_DIR = join(ROOT, "prompts");
