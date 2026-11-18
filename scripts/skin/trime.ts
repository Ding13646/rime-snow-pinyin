import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dump } from "js-yaml";
import { qwerty } from "./layouts";
import { rainbow } from "./palette";
import type { Config, KeyboardCollection } from "./types";

// 同文主题中本生成器使用的配置项；颜色可引用 preset_color_schemes 中的名称。
// https://github.com/osfans/trime/wiki/trime.yaml-詳解
export type TrimeColor = string;

export interface TrimePresetKey {
	label?: string;
	send?: string;
	text?: string;
	commit?: string;
	toggle?: string;
	states?: string[];
	select?: string;
	command?: string;
	option?: string;
	functional?: boolean;
	repeatable?: boolean;
	shift_lock?: "click" | "long" | "ascii_long";
}

export interface TrimeKey {
	click: string;
	width: number;
	swipe_up?: string;
	swipe_down?: string;
	long_click?: string;
	label_symbol?: string;
	hint?: string;
	key_back_color: TrimeColor;
	hilited_key_back_color: TrimeColor;
	key_text_color?: TrimeColor;
	hilited_key_text_color?: TrimeColor;
	key_symbol_color?: TrimeColor;
	hilited_key_symbol_color?: TrimeColor;
}

export interface TrimeKeyboard {
	name: string;
	ascii_mode: 0 | 1;
	ascii_keyboard?: string;
	reset_ascii_mode: boolean;
	lock: boolean;
	label_transform: "none" | "uppercase";
	columns: number;
	width: number;
	height: number;
	keys: TrimeKey[];
}

export interface TrimeColorScheme {
	name: string;
	author: string;
	dark_scheme?: string;
	light_scheme?: string;
	[color: string]: TrimeColor | undefined;
}

export interface TrimeToolbarButton {
	action: string;
	long_press_action?: string;
	size: [number, number];
	foreground: { style: string; font_size: number };
}

export interface TrimeSkin {
	config_version: string;
	name: string;
	author: string;
	style: {
		__include: string;
		keyboards: string[];
		auto_caps: boolean;
		key_text_size: number;
		key_long_text_size: number;
		symbol_text_size: number;
		horizontal_gap: number;
		vertical_gap: number;
		round_corner: number;
		keyboard_height: number;
		keyboard_height_land: number;
		candidate_text_size: number;
		comment_text_size: number;
	};
	preedit: { foreground: { font_size: number } };
	window: {
		foreground: {
			label_font_size: number;
			text_font_size: number;
			comment_font_size: number;
		};
	};
	tool_bar: {
		button_spacing: number;
		primary_button: TrimeToolbarButton;
		buttons: TrimeToolbarButton[];
	};
	android_keys: { __include: string };
	fallback_colors: Record<string, string>;
	preset_color_schemes: Record<string, TrimeColorScheme>;
	preset_keys: Record<string, TrimePresetKey>;
	preset_keyboards: Record<string, TrimeKeyboard>;
}

const author = "谭淞宸 <i@tansongchen.com>";

// 用 send 发送符号键，让 Rime 处理中文标点和顶功；symbol 键盘才直接上屏。
const symbolKeys: Record<string, string> = {
	" ": "space",
	"~": "asciitilde",
	"!": "exclam",
	"@": "at",
	"#": "numbersign",
	$: "dollar",
	"%": "percent",
	"^": "asciicircum",
	"&": "ampersand",
	"*": "asterisk",
	"(": "parenleft",
	")": "parenright",
	_: "underscore",
	"+": "plus",
	"-": "minus",
	"=": "equal",
	"|": "bar",
	"\\": "backslash",
	"[": "bracketleft",
	"]": "bracketright",
	"{": "braceleft",
	"}": "braceright",
	";": "semicolon",
	":": "colon",
	"'": "apostrophe",
	'"': "quotedbl",
	",": "comma",
	".": "period",
	"<": "less",
	">": "greater",
	"/": "slash",
	"?": "question",
	"`": "grave",
};

const actions: Record<string, TrimePresetKey> = {
	space: { label: " ", send: "space" },
	backspace: { label: "⌫", send: "BackSpace", repeatable: true },
	enter: { label: "↵", send: "Return" },
	shift: { label: "⇧", send: "Shift_L", shift_lock: "click" },
	"#中英切换": {
		label: "中/英",
		toggle: "ascii_mode",
		send: "SWITCH_CHARSET",
	},
	"#简繁切换": {
		label: "简/繁",
		toggle: "traditionalization",
		send: "SWITCH_CHARSET",
	},
	"#重输": { label: "清空", send: "Escape" },
	"#换行": { label: "换行", commit: "\n" },
	"#RimeSwitcher": { label: "选单", send: "F4" },
	"#方案切换": { label: "方案", send: "Control+Shift+1" },
	"#capsLocked": { label: "大写", send: "Shift_L", shift_lock: "click" },
	"#撤销": { label: "撤销", send: "Control+z" },
	"#剪切": { label: "剪切", send: "Control+x" },
	"#复制": { label: "复制", send: "Control+c" },
	"#粘贴": { label: "粘贴", send: "Control+v" },
	"#重做": { label: "重做", send: "Control+Shift+z" },
};

function parseAction(
	raw: string,
	symbol: boolean,
	keyboards: KeyboardCollection,
): TrimePresetKey {
	if (raw.length === 1) {
		// 字母仍发送按键，才能随同文的 Shift 状态切换大小写。
		if (symbol && !/^[a-zA-Z]$/.test(raw)) return { label: raw, commit: raw };
		const send = /^[A-Z]$/.test(raw)
			? `Shift+${raw.toLowerCase()}`
			: (symbolKeys[raw] ?? raw);
		return { label: raw, send };
	}
	if (raw.startsWith("*")) return { send: raw.slice(1) };
	if (raw.startsWith("!")) {
		const target = raw.slice(1);
		if (!keyboards[target]) throw new Error(`缺少同文键盘：${target}`);
		return { label: "数符", send: "Eisu_toggle", select: target };
	}
	const action = actions[raw];
	if (!action) throw new Error(`未支持的同文按键动作：${raw}`);
	return { ...action };
}

function makeColorScheme(dark: boolean): TrimeColorScheme {
	const text = dark ? "#ffffff" : "#000000";
	const background = dark ? "#2c2c2c" : "#d1d1d1";
	const scheme: TrimeColorScheme = {
		name: dark ? "冰雪・暗色" : "冰雪・亮色",
		author,
		...(dark ? { light_scheme: "default" } : { dark_scheme: "dark" }),
		text_color: text,
		back_color: background,
		border_color: background,
		candidate_text_color: text,
		comment_text_color: text,
		hilited_text_color: text,
		hilited_back_color: background,
		hilited_candidate_text_color: text,
		hilited_candidate_back_color: dark ? "#505050" : "#bbbbbb",
		hilited_comment_text_color: text,
		key_text_color: text,
		hilited_key_text_color: text,
		key_symbol_color: dark ? "#e5e5e5" : "#575757",
		hilited_key_symbol_color: text,
		key_back_color: dark ? "#707070" : "#f7f7f7",
		hilited_key_back_color: dark ? "#4c4c4c" : "#e7e7e7",
		keyboard_back_color: background,
		fn_back: dark ? "#4c4c4c" : "#e7e7e7",
		fn_hilited: dark ? "#707070" : "#f7f7f7",
	};
	for (const [index, color] of rainbow.entries()) {
		scheme[`color${index}`] = dark ? color.dark : color.light;
		scheme[`color${index}_alt`] = dark ? color.dark2 : color.light2;
	}
	return scheme;
}

function makeKeyboard(
	name: string,
	config: Omit<Config, "dark">,
	keyboards: KeyboardCollection,
	presetKeys: Record<string, TrimePresetKey>,
): TrimeKeyboard {
	const keys: TrimeKey[] = [];
	const addAction = (raw: string, label?: string): string => {
		const id = `snow_${name}_${Object.keys(presetKeys).length}`;
		presetKeys[id] = {
			functional: false,
			...parseAction(raw, config.symbol ?? false, keyboards),
			...(label === undefined ? {} : { label }),
		};
		return id;
	};
	for (const row of config.keyInfos) {
		for (const [index, key] of row.entries()) {
			const isAlphabet = /^[a-z]$/.test(key.action);
			const isCharacter = key.action.length === 1;
			const up = key.up ?? (isAlphabet ? key.action.toUpperCase() : undefined);
			const [numerator, denominator] = (key.width ?? `1/${row.length}`)
				.split("/")
				.map(Number);
			const width = (100 * numerator) / denominator;
			if (!Number.isFinite(width) || width <= 0 || width > 100) {
				throw new Error(`无效的同文按键宽度：${key.width}`);
			}
			let background = isCharacter ? "key_back_color" : "fn_back";
			let highlight = isCharacter ? "hilited_key_back_color" : "fn_hilited";
			if (isAlphabet && config.colorful) {
				if (index >= rainbow.length) throw new Error("七色键盘不能超过七列");
				const special = (config.specialCharacters ?? "aeiou").includes(
					key.action,
				);
				background = `color${index}${special ? "_alt" : ""}`;
				highlight = `color${index}${special ? "" : "_alt"}`;
			}
			// 图标名称仅供元书输入法使用，同文采用动作自带的文字或通用符号。
			const label =
				isCharacter || key.action.startsWith("*") ? key.label : undefined;
			const click = addAction(key.action, label);
			const rendered: TrimeKey = {
				click,
				width,
				key_back_color: background,
				hilited_key_back_color: highlight,
			};
			if (up) {
				rendered.swipe_up = addAction(up, key.upLabel);
				rendered.label_symbol =
					key.upLabel ?? presetKeys[rendered.swipe_up].label;
			}
			if (key.down) {
				rendered.swipe_down = addAction(key.down, key.downLabel);
				rendered.hint = key.downLabel ?? presetKeys[rendered.swipe_down].label;
			}
			// 长按补充上滑功能，也让 Shift 的长按行为有实际绑定。
			rendered.long_click = rendered.swipe_up;
			if (!config.label) {
				// 保留动作标签：同文在中文 Shift 状态下还用它生成大写文本。
				rendered.key_text_color = "#00000000";
				rendered.hilited_key_text_color = "#00000000";
				rendered.key_symbol_color = "#00000000";
				rendered.hilited_key_symbol_color = "#00000000";
				if (key.action === "shift") presetKeys[click].label = " ";
			}
			keys.push(rendered);
		}
	}
	return {
		name,
		ascii_mode: name === "alphabetic" ? 1 : 0,
		...(name === "pinyin" && keyboards.alphabetic
			? { ascii_keyboard: "alphabetic" }
			: {}),
		reset_ascii_mode: name === "pinyin" || name === "alphabetic",
		lock: name === "pinyin" || name === "alphabetic",
		label_transform: "none",
		columns: Math.max(...config.keyInfos.map((row) => row.length)),
		width: 10,
		height: 256 / config.keyInfos.length,
		keys,
	};
}

export function makeTrimeSkin(
	name: string,
	keyboards: KeyboardCollection,
	toolbarWidth = 350,
): TrimeSkin {
	if (!keyboards.pinyin) throw new Error("同文皮肤必须提供 pinyin 键盘");
	if (!Number.isFinite(toolbarWidth) || toolbarWidth < 7) {
		throw new Error("同文工具栏宽度必须为不小于 7 的 dp 数值");
	}
	// 工具栏固定提供中文、英文和编辑入口，不依赖某套皮肤是否自带副键盘。
	const allKeyboards: KeyboardCollection = {
		...keyboards,
		alphabetic: keyboards.alphabetic ?? {
			colorful: false,
			label: true,
			keyInfos: qwerty,
			symbol: true,
		},
		editor: {
			colorful: false,
			label: true,
			keyInfos: [
				[
					{ action: "*Control+a", label: "全选" },
					{ action: "*Home", label: "行首" },
					{ action: "*Up", label: "↑" },
					{ action: "*End", label: "行尾" },
					{ action: "#重输" },
				],
				[
					{ action: "#剪切" },
					{ action: "*Left", label: "←" },
					{ action: "*Down", label: "↓" },
					{ action: "*Right", label: "→" },
					{ action: "backspace" },
				],
				[
					{ action: "#复制" },
					{ action: "#粘贴" },
					{ action: "#撤销" },
					{ action: "#重做" },
					{ action: "enter" },
				],
			],
		},
	};
	const presetKeys: Record<string, TrimePresetKey> = {
		menu_keyboard: {
			label: "菜单",
			send: "FUNCTION",
			command: "menu_keyboard",
		},
		Snow_settings: { label: "设置", send: "SETTINGS" },
		Snow_hide: { label: "收起", send: "BACK" },
		Snow_phrase: {
			label: "常用语",
			send: "FUNCTION",
			command: "clipboard_window",
			option: "1",
		},
		Snow_clipboard: {
			label: "剪贴板",
			send: "FUNCTION",
			command: "clipboard_window",
			option: "0",
		},
	};
	const presetKeyboards: Record<string, TrimeKeyboard> = {};
	const labels: Record<string, string> = {
		pinyin: "中文",
		alphabetic: "ABC",
		numeric: "123",
		symbolic: "符号",
		editor: "编辑",
	};
	for (const [id, config] of Object.entries(allKeyboards)) {
		presetKeyboards[id] = makeKeyboard(id, config, allKeyboards, presetKeys);
		const action = `Snow_keyboard_${id}`;
		presetKeys[action] = {
			label: labels[id] ?? id,
			send: "Eisu_toggle",
			select: id,
		};
	}
	// .default 会按方案自动匹配；这里让所有方案使用所选皮肤的主键盘。
	presetKeyboards.default = presetKeyboards.pinyin;
	const makeButton = (
		action: string,
		style: string,
		column: number,
	): TrimeToolbarButton => ({
		action,
		// 默认七键各 50 dp；剩余宽度留在左侧菜单与右侧按钮组之间。
		size: [
			Math.round(((column + 1) * toolbarWidth) / 7) -
				Math.round((column * toolbarWidth) / 7),
			-1,
		],
		foreground: { style, font_size: 18 },
	});
	// 同文将 buttons 从右向左排，首项还会单独固定在最右侧。
	// 视觉顺序与元书一致：菜单、常用语、剪贴板、编辑、中文、ABC、收起。
	const buttons = [
		makeButton("Snow_hide", "ic@keyboard_close", 6),
		makeButton("Snow_keyboard_alphabetic", "ABC", 5),
		makeButton("Snow_keyboard_pinyin", "中", 4),
		makeButton("Snow_keyboard_editor", "ic@cursor_text", 3),
		makeButton("Snow_clipboard", "ic@clipboard", 2),
		makeButton("Snow_phrase", "ic@format_quote_close", 1),
	];
	return {
		config_version: "3.0",
		name,
		author,
		style: {
			__include: "trime:/style",
			keyboards: [".default", ...Object.keys(allKeyboards)],
			auto_caps: false,
			key_text_size: 20,
			key_long_text_size: 16,
			symbol_text_size: 10,
			horizontal_gap: 4,
			vertical_gap: 4,
			round_corner: 2,
			keyboard_height: 256,
			keyboard_height_land: 200,
			candidate_text_size: 16,
			comment_text_size: 14,
		},
		preedit: { foreground: { font_size: 16 } },
		window: {
			foreground: {
				label_font_size: 12,
				text_font_size: 16,
				comment_font_size: 14,
			},
		},
		tool_bar: {
			button_spacing: 0,
			primary_button: {
				...makeButton("menu_keyboard", "ic@dots_horizontal", 0),
				long_press_action: "Snow_settings",
			},
			buttons,
		},
		android_keys: { __include: "trime:/android_keys" },
		fallback_colors: { candidate_text_color: "text_color" },
		preset_color_schemes: {
			default: makeColorScheme(false),
			dark: makeColorScheme(true),
		},
		preset_keys: presetKeys,
		preset_keyboards: presetKeyboards,
	};
}

export function generateTrimeSkin(
	prefix: string,
	name: string,
	keyboards: KeyboardCollection,
	toolbarWidth?: number,
) {
	mkdirSync(prefix, { recursive: true });
	writeFileSync(
		join(prefix, `${name}.trime.yaml`),
		dump(makeTrimeSkin(name, keyboards, toolbarWidth), { noRefs: true }),
		"utf8",
	);
}
