// 从 Rime 用户词典快照导出按词频排序的词、编码和使用次数。

import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { rootPath, writeOutput } from "./lib/paths";

function main() {
	const input = process.argv[2];
	if (!input)
		throw new Error(
			"用法：bun scripts/export-user-dict.ts <用户词典快照> [输出文件]",
		);
	const lines = readFileSync(input, "utf8")
		.split(/\r?\n/)
		.filter((line) => line.trim() && !line.trimStart().startsWith("#"));
	const records = parse(lines.join("\n"), {
		delimiter: "\t",
		relax_column_count: true,
		trim: true,
	}) as string[][];
	const words = records.map(([code, word, metadata]) => ({
		word,
		code: code.trim(),
		count: Number.parseInt(metadata?.match(/c=(\d+)/)?.[1] ?? "0", 10),
	}));
	words.sort((a, b) => b.count - a.count);
	writeOutput(
		process.argv[3] ?? rootPath("output", "user-dict.tsv"),
		words
			.map(({ word, code, count }) => `${word}\t${code}\t${count}\n`)
			.join(""),
	);
}

if (import.meta.main) main();
