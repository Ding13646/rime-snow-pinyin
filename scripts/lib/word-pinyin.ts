import { readFileSync } from "node:fs";
import CompleteDict from "@pinyin-pro/data/complete.json";
import { addDict, convert, customPinyin, pinyin } from "pinyin-pro";
import { readCharacterDictionary } from "./dictionary";
import { dataPath } from "./paths";

function applyDiff(cdict: Map<string, string[]>) {
	const diff1: Record<string, string> = {};
	for (const [word, rawPinyinList] of cdict) {
		const pinyinList = rawPinyinList.map((x) =>
			convert(x.replace("5", "0").replace("v", "ü")),
		);
		const ref = pinyin(word, { multiple: true, nonZh: "removed" });
		const refList = ref.split(" ");
		const getIndex = (p: string) => {
			const index = refList.indexOf(p);
			return index === -1 ? 100 : index;
		};
		pinyinList.sort((a, b) => getIndex(a) - getIndex(b));
		if (ref === word) {
			diff1[word] = pinyinList.join(" ");
		}
	}
	customPinyin(diff1);
	const overrides: Record<string, string> = {};
	for (const line of readFileSync(dataPath("word-pinyin-overrides.tsv"), "utf8")
		.trim()
		.split(/\r?\n/)) {
		const [word, reading] = line.split("\t");
		overrides[word] = reading;
	}
	customPinyin(overrides);
}

function fixDictEntry(
	word: string,
	pinyin_list: string[],
	dict: Map<string, string[]>,
) {
	let resolved = true;
	const chars = [...word];
	const updatedList = pinyin_list.map((syllable, i) => {
		const char = chars[i];
		const possible = dict
			.get(char)
			?.map((x) => x.replace("5", "0").replace("v", "ü"));
		if (!possible) return syllable;
		const syllableNum = convert(syllable, { format: "symbolToNum" });
		const syllableWithoutTone = syllableNum.replace(/\d/g, "");
		if (possible.includes(syllableNum)) return syllable;
		if (possible.length === 1) return convert(possible[0]);
		const matching = possible.filter((p) => p.startsWith(syllableWithoutTone));
		if (matching.length === 1) return convert(matching[0]);
		resolved = false;
		return syllable;
	});
	return [resolved, updatedList.join(" ")] as const;
}

function processCompleteDict(cdict: Map<string, string[]>) {
	const diff = new Map<string, string>();
	for (const line of readFileSync(
		dataPath("complete-pinyin-overrides.tsv"),
		"utf-8",
	).split("\n")) {
		const [key, value] = line.split("\t");
		diff.set(key, value);
	}
	const newDict: Record<string, [string, number, string]> = {};
	const undetermined: string[][] = [];

	for (const [word, value] of Object.entries(CompleteDict)) {
		const [reading, weight, partOfSpeech] = value as [string, number, string];
		const pinyin = diff.get(word) ?? reading;
		const [resolved, updated] = fixDictEntry(word, pinyin.split(" "), cdict);
		newDict[word] = [updated, weight, partOfSpeech];
		if (!resolved) {
			undetermined.push([word, updated]);
		}
	}

	return { dictionary: newDict, undetermined };
}
let initialized:
	| { dict: Map<string, string[]>; undetermined: string[][] }
	| undefined;

// 仅在调用时初始化；导入模块不会读词典、改注音配置或写诊断文件。
export function initializePinyin() {
	if (initialized) return initialized;
	const dict = readCharacterDictionary();
	applyDiff(dict);
	const { dictionary, undetermined } = processCompleteDict(dict);
	addDict(dictionary);
	initialized = { dict, undetermined };
	return initialized;
}

export function getPinyin(word: string) {
	initializePinyin();
	return pinyin(word, {
		toneType: "num",
		v: true,
		nonZh: "removed",
		type: "array",
		toneSandhi: false,
	}).map((x) => x.replaceAll("0", "5"));
}
