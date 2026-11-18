export const 拼音词典发布页 =
	"https://github.com/hanzi-chai/characters/releases/tag/20261025";
const 拼音词典下载地址 =
	"https://github.com/hanzi-chai/characters/releases/download/20261025/pinyin.tsv";

export async function 获取大字集拼音() {
	const 响应 = await fetch(拼音词典下载地址);
	if (!响应.ok) {
		throw new Error(`下载拼音词典失败：HTTP ${响应.status}`);
	}
	const [表头, ...原始数据] = (await 响应.text()).trimEnd().split(/\r?\n/);
	if (表头 !== "codepoint\tchar\tpinyin\tstatus\tblock\tsources") {
		throw new Error("拼音词典表头不符合预期");
	}
	const 处理结果: { 汉字: string; 拼音: string }[] = [];
	for (const 行 of 原始数据) {
		const [, 汉字, 拼音列表] = 行.split("\t");
		for (const 拼音 of 拼音列表.split(",")) {
			// 缺音和一字多音节读音不进入单音节词典，数字声调和 v、ê 沿用原表。
			if (拼音 === "?" || 拼音.includes("-")) continue;
			处理结果.push({ 汉字, 拼音 });
		}
	}
	return 处理结果;
}
