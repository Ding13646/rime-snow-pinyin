// 从三列笔画表生成带字形来源的笔画词典：bun scripts/generate-stroke-dict.ts <输入文件> [输出文件]
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./lib/paths";
import { VERSION } from "./version";

export function generateBihua(input: string) {
	const entries = new Map<
		string,
		{ text: string; code: string; sources: Set<string> }
	>();
	let skipped = 0;
	for (const [index, line] of input
		.replace(/^\uFEFF/, "")
		.split(/\r?\n/)
		.entries()) {
		if (!line.trim()) continue;
		const fields = line.split("\t");
		if (fields.length !== 3 || Array.from(fields[0]).length !== 1) {
			throw new Error(
				`第 ${index + 1} 行应为汉字、笔画、标签三列（以制表符分隔）`,
			);
		}
		const [text, strokes, tags] = fields;
		if (!/^(?:[A-Z](?:,[A-Z])*)?$/.test(tags)) {
			throw new Error(`第 ${index + 1} 行的标签无效：${tags}`);
		}
		// 原表有少量已标注来源但尚未提供笔画的记录，不能生成空编码。
		if (!strokes.trim()) {
			skipped++;
			continue;
		}
		if (!/^[1-5](?: +[1-5])*$/.test(strokes.trim())) {
			throw new Error(`第 ${index + 1} 行的笔画无效：${strokes}`);
		}
		const code = strokes.replace(/ /g, "");
		const key = `${text}\t${code}`;
		const entry = entries.get(key) ?? {
			text,
			code,
			sources: new Set<string>(),
		};
		for (const source of tags ? tags.split(",") : [""])
			entry.sources.add(source);
		entries.set(key, entry);
	}
	const rows = [...entries.values()].map(({ text, code, sources }) => {
		// 空标签代表通用字形；同字同笔顺的地区标签合并，保证生成结果稳定。
		const tags = sources.has("") ? "" : [...sources].sort().join("");
		return `${text}\t${code}${tags}`;
	});
	const dictionary = `# Rime dictionary
# encoding: utf-8
# 由 scripts/generate-stroke-dict.ts 生成，请勿手改。
# 两列依次为汉字、笔顺＋连续来源标签；12345 分别表示横、竖、撇、点、折。
# 无标签记录为通用字形；棱镜去掉标签供原生翻译器查询，Lua filter 按来源筛选。

---
name: snow_bihua
version: "${VERSION}"
sort: by_weight
use_preset_vocabulary: true
max_phrase_length: 1
...

${rows.join("\n")}
`;
	return { dictionary, count: rows.length, skipped };
}

if (import.meta.main) {
	const source = process.argv[2];
	if (!source) {
		console.error(
			"用法：bun scripts/generate-stroke-dict.ts <输入文件> [输出文件]",
		);
		process.exit(1);
	}
	const input = resolve(source);
	const output = resolve(
		process.argv[3] ?? resolve(ROOT, "snow_bihua.dict.yaml"),
	);
	const result = generateBihua(readFileSync(input, "utf8"));
	writeFileSync(output, result.dictionary);
	console.log(
		`已生成 ${output}：${result.count} 条笔顺，跳过 ${result.skipped} 条空笔画记录`,
	);
}
