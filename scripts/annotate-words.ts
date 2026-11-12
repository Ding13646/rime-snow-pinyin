// 优先复用现有词典的注音，再按冰雪拼音的规则补充新词。
import { readFileSync } from "node:fs";
import { readDictionary } from "./lib/dictionary";
import { rootPath, writeOutput } from "./lib/paths";
import { getPinyin } from "./lib/word-pinyin";

function main() {
	const input = process.argv[2];
	if (!input)
		throw new Error("用法：bun scripts/annotate-words.ts <词表> [输出文件]");
	const dictionary = new Map<string, string>();
	for (const name of ["base", "ext", "tencent"]) {
		for (const [word, pinyin] of readDictionary(
			rootPath(`frost_dicts/cn_dicts/${name}.dict.yaml`),
		)) {
			dictionary.set(word, pinyin);
		}
	}
	const words = readFileSync(input, "utf8")
		.trim()
		.split(/\r?\n/)
		.filter((line) => line.trim() && !line.startsWith("#"))
		.map((line) => line.split("\t")[0]);
	const rows = words.map(
		(word) => `${word}\t${dictionary.get(word) ?? getPinyin(word).join(" ")}`,
	);
	writeOutput(
		process.argv[3] ?? rootPath("output", "annotated-words.tsv"),
		`${rows.join("\n")}\n`,
	);
}

if (import.meta.main) main();
