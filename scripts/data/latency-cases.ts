// 编码按 flypy21 两键码选取，再在首次遍历时校验首页候选或上屏结果。
// 不从功能 spec 自动抽取：spec 可能遍历所有候选，而且夹杂补丁、预置词频及故意无效的编码。
export interface LatencyCase {
	id: string;
	keys: string;
	source: string;
	page?: string;
	commit?: string;
	options?: string[];
}

export const SCHEMA_NAMES: Record<string, string> = {
	snow_jiandao: "冰雪键道",
};

const sentence = "剥削输入法负面新闻。";

export const LATENCY_CASES: Record<string, LatencyCase[]> = {
	snow_jiandao: [
		{ id: "radical", keys: "Uwangyan", page: "琰", source: "README.md" },
		{
			id: "dense-prefix",
			keys: "mdd",
			page: "目的地",
			source: "snow-jiandao/index.md：连续例句里的「目的地」；从实测慢事件提取",
		},
		{
			id: "single-shape",
			keys: "blo",
			page: "冰",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "double",
			keys: "blxr",
			page: "冰雪",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "triple",
			keys: "erf",
			page: "输入法",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "four",
			keys: "fmxw",
			page: "充满希望",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "long",
			keys: "whrm",
			page: "中华人民共和国",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "paging",
			keys: "b{Page_Down}{Page_Up}",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "editing",
			keys: "blxr{BackSpace}r",
			page: "冰雪",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "popping",
			keys: "blxrd",
			commit: "剥削",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "buffered",
			keys: "blxrejrjfx  ",
			commit: "剥削输入法",
			options: ["buffered"],
			source: "snow-jiandao/basic.md",
		},
		{
			id: "sentence",
			keys: "blxrejrjfx fmxw.",
			commit: sentence,
			source: "snow-jiandao/index.md",
		},
	],
};
