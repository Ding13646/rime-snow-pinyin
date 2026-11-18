import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { writeOutput } from "../../lib/paths";

function main() {
	const input = process.argv[2];
	if (!input)
		throw new Error(
			"用法：bun scripts/experiments/frequency/derive-character-frequency.ts <语料目录> [输出文件]",
		);
	const base = resolve(input);
	const 单字频率 = new Map<string, number>();
	for (const line of readFileSync(join(base, "万象单字频.txt"), "utf-8")
		.trim()
		.split("\n")) {
		const [word, _, frequency] = line.split("\t");
		单字频率.set(word, (单字频率.get(word) ?? 0) + +frequency);
	}
	console.log(`单字频率数量: ${单字频率.size}`);
	const multiples = readFileSync(join(base, "万象多字词频.txt"), "utf-8")
		.trim()
		.split("\n")
		.map((line) => {
			const [word, frequency] = line.split("\t");
			return { word, frequency: +frequency };
		});
	for (const { word, frequency } of multiples) {
		for (const char of [...word]) {
			const 原频 = 单字频率.get(char);
			if (原频 !== undefined) {
				const 扣除后频率 = 原频 - frequency;
				if (扣除后频率 < 0)
					console.log(`Negative frequency for ${char}: ${扣除后频率}`);
				单字频率.set(char, 扣除后频率);
			}
		}
	}

	writeOutput(
		process.argv[3] ?? join(base, "万象一字词频（推导）.txt"),
		[...单字频率.entries()]
			.sort(([_, av], [__, bv]) => bv - av)
			.map(([key, value]) => {
				return `${key}\t${Math.max(0, value)}`;
			})
			.join("\n"),
	);
}

if (import.meta.main) main();
