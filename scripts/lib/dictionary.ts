import { readFileSync } from "node:fs";
import { rootPath } from "./paths";

// 按词典结束标记读取正文，不依赖头部行数；同时兼容雾凇词典的两列记录。
export function readDictionary(path: string): string[][] {
	const lines = readFileSync(path, "utf8").split(/\r?\n/);
	const start = lines.findIndex((line) => line.trim() === "...");
	if (start < 0) throw new Error(`词典缺少正文起始标记 ...：${path}`);
	return lines
		.slice(start + 1)
		.filter(
			(line) =>
				line.trim() && !line.trimStart().startsWith("#") && line.includes("\t"),
		)
		.map((line) => line.split("\t"));
}

export function readCharacterDictionary() {
	const dict = new Map<string, string[]>();
	for (const [word, pinyin] of readDictionary(
		rootPath("frost_dicts/cn_dicts/8105.dict.yaml"),
	)) {
		if ([...word].length !== 1 || /^[a-zA-Z0-9]$/.test(word)) continue;
		dict.set(word, (dict.get(word) ?? []).concat(pinyin));
	}
	return dict;
}
