import { readFileSync, writeFileSync } from "node:fs";
import matter from "gray-matter";
import { 拼音词典发布页, 获取大字集拼音 } from "./lib/character-pinyin";
import { dataPath, rootPath } from "./lib/paths";
import { checkPinyinReadings } from "./lib/pinyin-validation";
import { VERSION } from "./version";

async function main() {
	const 通用规范拼音 = readFileSync(dataPath("tygf-pinyin.tsv"), "utf-8")
		.trim()
		.split("\n");
	const 大字集拼音 = await 获取大字集拼音();
	// 先验证全部输入读音；失败时保留已有词典，避免异常音节进入产物。
	checkPinyinReadings([
		...通用规范拼音.map((line) => line.split("\t")[1]),
		...大字集拼音.map(({ 拼音 }) => 拼音),
	]);

	const 通用规范汉字 = new Set<string>();
	// 两份来源共用去重集合，保留首次出现的字音组合及其权重。
	const 已输出拼音 = new Set<string>();

	const 文件内容 = [
		"# Rime dictionary",
		"# encoding: utf-8",
		"#",
		"# Snow Pinyin - 冰雪拼音",
		"# 《通用规范汉字表》内读音依据《通用规范汉字字典》，收录了 8105 个汉字，共 8773 音",
		`# 其他汉字的读音依据 ${拼音词典发布页}`,
		"#",
		"",
	];

	文件内容.push(
		matter.stringify(
			"",
			{
				name: "snow_pinyin",
				version: VERSION,
				sort: "by_weight",
				use_preset_vocabulary: false,
			},
			{ delimiters: ["---", "..."] },
		),
	);
	文件内容.push("# 字母");
	文件内容.push(
		"# 用 ~ 和 ~~ 作为特殊音节的标记，具体如何输入可以由方案自行决定，不影响简拼",
	);
	for (const letter of "abcdefghijklmnopqrstuvwxyz") {
		文件内容.push(`${letter}\t~${letter}\t10000`);
	}
	文件内容.push("");
	for (const letter of "abcdefghijklmnopqrstuvwxyz") {
		文件内容.push(`${letter.toUpperCase()}\t~~${letter}\t10000`);
	}
	文件内容.push("");
	文件内容.push("# 数字");
	for (const [index, number] of [
		"ling2",
		"yi1",
		"er4",
		"san1",
		"si4",
		"wu3",
		"liu4",
		"qi1",
		"ba1",
		"jiu3",
		"shi2",
	].entries()) {
		文件内容.push(`${index}\t${number}\t1000`);
	}
	文件内容.push("");
	文件内容.push("#《通用规范汉字字典》");
	for (const line of 通用规范拼音) {
		let [char, pinyin, frequency] = line.split("\t");
		const 字音组合 = `${char}\t${pinyin}`;
		if (已输出拼音.has(字音组合)) continue;
		已输出拼音.add(字音组合);
		if (parseInt(frequency, 10) < 2) {
			frequency = "2";
		}
		文件内容.push(`${char}\t${pinyin}\t${frequency}`);
		通用规范汉字.add(char);
	}
	文件内容.push("");
	文件内容.push("# 大字集");
	let 增补拼音总数 = 0;
	for (const { 汉字, 拼音 } of 大字集拼音) {
		const 字音组合 = `${汉字}\t${拼音}`;
		if (已输出拼音.has(字音组合)) continue;
		已输出拼音.add(字音组合);
		if (通用规范汉字.has(汉字)) {
			增补拼音总数++;
			console.log(`增补拼音: ${汉字} ${拼音}`);
		}
		const 编码 = 汉字.codePointAt(0) ?? 0;
		const 权重 = 0x4e00 <= 编码 && 编码 <= 0x9fff ? 1 : 0;
		文件内容.push(`${汉字}\t${拼音}\t${权重}`);
	}
	writeFileSync(
		process.argv[2] ?? rootPath("snow_pinyin.dict.yaml"),
		文件内容.join("\n"),
	);

	console.log(`增补拼音总数: ${增补拼音总数}`);
}

if (import.meta.main) await main();
