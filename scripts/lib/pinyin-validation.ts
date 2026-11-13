import { SpellingAlgebra } from "./algebra";
import { rootPath } from "./paths";

// 正则依据 ../input 的拼写教程，独立于方案中的输入、顶功和简码规则。
// 展开 speller/algebra，忽略 abbrev；derive 保留全部完整音节分支。
export const SYLLABLE_PATTERNS = [
	{
		schema: "snow_jiandao",
		name: "冰雪键道",
		key: "speller/algebra",
		// snow-jiandao/index.md：声韵两码，无调码。
		pattern: /^[a-z]{2}$/,
	},
];

export function checkPinyinReadings(readings: Iterable<string>) {
	const syllables = [...new Set(readings)].filter(
		// 字母使用专门的映射规则，不属于汉字音节。
		(reading) => !/^~{1,2}[a-z]$/.test(reading),
	);
	const invalid: string[] = [];
	for (const { schema, name, key, pattern } of SYLLABLE_PATTERNS) {
		const algebra = new SpellingAlgebra(rootPath(`${schema}.schema.yaml`), key);
		for (const reading of syllables) {
			for (const code of algebra.applyAll(reading)) {
				if (!pattern.test(code)) {
					invalid.push(`${name}：${reading} → ${code}，预期 ${pattern}`);
				}
			}
		}
	}
	if (invalid.length > 0) {
		throw new Error(
			`完整音节编码不符合方案的拼写结构，请检查拼音来源或拼写规则：\n${invalid.join("\n")}`,
		);
	}
	return syllables.length;
}
