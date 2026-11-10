// 编码先按 ../input 的教程选取，再在首次遍历时校验首页候选或上屏结果。
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

const sentence = "充满希望的跋涉比到达目的地更能给人乐趣。";

export const LATENCY_CASES: Record<string, LatencyCase[]> = {
	snow_jiandao: [
		{ id: "radical", keys: "uwangyan", page: "琰", source: "README.md" },
		{
			id: "dense-prefix",
			keys: "mdd",
			page: "目的地",
			source: "snow-jiandao/index.md：连续例句里的「目的地」；从实测慢事件提取",
		},
		{
			id: "single-shape",
			keys: "bgov",
			page: "冰",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "double",
			keys: "bgxh",
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
			keys: "wmxw",
			page: "充满希望",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "long-shape",
			keys: "kxfquoaaa",
			page: "科学发展观",
			source: "snow-jiandao/basic.md；逐字补形见 spec/snow_jiandao.test.yaml",
		},
		{
			id: "long",
			keys: "fhrmGHG",
			page: "中华人民共和国",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "mixed",
			keys: "eJrJfS",
			page: "输入法",
			source: "snow-jiandao/index.md；spec/snow_jiandao.test.yaml",
		},
		{
			id: "paging",
			keys: "b{Page_Down}{Page_Up}",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "editing",
			keys: "bgxho{BackSpace}",
			page: "冰雪",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "popping",
			keys: "kxfqGbgxh",
			commit: "科学发展观",
			source: "snow-jiandao/basic.md",
		},
		{
			id: "buffered",
			keys: "bgxherf  ",
			commit: "冰雪输入法",
			options: ["buffered"],
			source: "snow-jiandao/basic.md",
		},
		{
			id: "sentence",
			keys: "wmxwod bseebk dzdsmdd grnrgwrnleql.",
			commit: sentence,
			source: "snow-jiandao/index.md",
		},
	],
};
