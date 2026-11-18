import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function rootPath(...parts: string[]) {
	return resolve(ROOT, ...parts);
}

export function dataPath(name: string) {
	return rootPath("scripts", "data", name);
}

export function writeOutput(path: string, content: string) {
	mkdirSync(dirname(resolve(path)), { recursive: true });
	writeFileSync(path, content, "utf8");
}
