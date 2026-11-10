import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { generateHamsterSkin } from "./skin/hamster";
import { jiandao, qwerty, shufu } from "./skin/layouts";
import { generateTrimeSkin } from "./skin/trime";
import type { KeyboardCollection } from "./skin/types";

function main() {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		options: {
			backend: { type: "string", default: "all" },
			"trime-toolbar-width": { type: "string" },
			help: { type: "boolean", short: "h" },
		},
		allowPositionals: true,
	});
	if (values.help) {
		console.log(
			"用法：bun scripts/generate-skins.ts [输出目录] [--backend hamster|trime|all] [--trime-toolbar-width 按键总宽度dp]（默认 all，工具栏七键各 50 dp）",
		);
		return;
	}
	const backend = values.backend;
	if (!["hamster", "trime", "all"].includes(backend ?? "")) {
		throw new Error(`未知的皮肤后端：${backend}`);
	}
	if (positionals.length > 1) throw new Error("只能指定一个输出目录");
	const toolbarWidth =
		values["trime-toolbar-width"] === undefined
			? undefined
			: Number(values["trime-toolbar-width"]);
	if (
		toolbarWidth !== undefined &&
		(!Number.isFinite(toolbarWidth) || toolbarWidth < 7)
	) {
		throw new Error("同文工具栏宽度必须为不小于 7 的 dp 数值");
	}
	const prefix = resolve(
		positionals[0] ??
			(backend === "hamster"
				? join(
						homedir(),
						"Library/Mobile Documents/iCloud~com~ihsiao~apps~Hamster3/Documents/Skins",
					)
				: "output/skins"),
	);
	const generateSkinFolder = (name: string, keyboards: KeyboardCollection) => {
		if (backend === "hamster" || backend === "all") {
			generateHamsterSkin(
				backend === "all" ? join(prefix, "hamster") : prefix,
				name,
				keyboards,
			);
		}
		if (backend === "trime" || backend === "all") {
			generateTrimeSkin(
				backend === "all" ? join(prefix, "trime") : prefix,
				name,
				keyboards,
				toolbarWidth,
			);
		}
	};
	const general = {
		colorful: false,
		label: true,
		keyInfos: qwerty,
		symbol: true,
	};
	const snow_jiandao = {
		colorful: true,
		label: true,
		keyInfos: jiandao,
		specialCharacters: "avuio",
	};
	const snow_jiandao_nolabel = {
		colorful: true,
		label: false,
		keyInfos: jiandao,
		specialCharacters: "avuio",
	};
	const snow_shufu = {
		colorful: false,
		label: true,
		keyInfos: shufu,
	};

	generateSkinFolder("键道 35 键", {
		pinyin: snow_jiandao,
		alphabetic: general,
		numeric: snow_shufu,
		symbolic: snow_shufu,
	});
	generateSkinFolder("键道 35 键・无刻", {
		pinyin: snow_jiandao_nolabel,
		alphabetic: general,
		numeric: snow_shufu,
		symbolic: snow_shufu,
	});

	console.log(`已生成 ${backend} 皮肤到 ${prefix}`);
}

if (import.meta.main) main();
