import { readDictionary } from "./lib/dictionary";
import { rootPath } from "./lib/paths";
import {
	checkPinyinReadings,
	SYLLABLE_PATTERNS,
} from "./lib/pinyin-validation";

export function checkPinyinDictionary() {
	const count = checkPinyinReadings(
		readDictionary(rootPath("frost_dicts/cn_dicts/8105.dict.yaml")).map(
			([, pinyin]) => pinyin,
		),
	);
	for (const { name, pattern } of SYLLABLE_PATTERNS) {
		console.log(`✓ ${name}音节编码检查：${count} 种读音，${pattern}`);
	}
}

if (import.meta.main) checkPinyinDictionary();
