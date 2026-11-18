import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { dump } from "js-yaml";
import { rainbow } from "./palette";
import type { Config, KeyboardCollection } from "./types";

export type HamsterSkinConfig = {
	name: string; // 皮肤名称
	author: string; // 作者名称
	fontface?: FontFace; // 字体名称
	pinyin: KeyboardConfig; // 拼音键盘配置
	alphabetic?: KeyboardConfig; // 字母键盘配置
	numeric: KeyboardConfig; // 数字键盘配置
	symbolic: KeyboardConfig; // 符号键盘配置
};

export type FontFaceConfig = {
	url: string; // 字体文件的 URL
	name: string; // 字体名称
	ranges?: { location: number; length: number }[]; // 可选的字体范围
};

export type KeyboardConfig = {
	iPhone: {
		portrait: string;
		landscape: string;
	};
	iPad: {
		portrait: string;
		landscape: string;
		floating: string;
	};
};

export type Keyboard = {
	preeditHeight: Height;
	preeditStyle: PreeditStyle;
	toolbarHeight: Height;
	toolbarStyle: ToolbarStyle;
	toolbarLayout: Layout;
	horizontalCandidatesStyle: HorizontalCandidateStyle;
	horizontalCandidatesLayout: Layout;
	verticalCandidatesStyle: VerticalCandidateStyle;
	verticalCandidatesLayout: Layout;
	candidateContextMenu: CandidateContextMenu;
	keyboardHeight: Height;
	keyboardStyle: KeyboardStyle;
	keyboardLayout: Layout;
	[k: string]: unknown; // 其他样式或属性
};

// 预编辑区 Preedit

export type PreeditStyle = {
	insets: Insets;
	backgroundStyle: Ref<Style>;
	foregroundStyle: Ref<Style>;
};

// 工具栏区 Toolbar

export type ToolbarStyle = {
	backgroundStyle: Ref<Style>;
};

export type HorizontalCandidateStyle = {
	insets?: Insets;
	backgroundStyle?: Ref<Style>;
};

export type HorizontalCandidates = {
	type: "horizontalCandidates";
	size: Size;
	insets: Insets;
	backgroundStyle: Ref<Style>;
	candidateStyle: Ref<CandidateStyle>;
};

export type CandidateStyle = {
	insets?: Insets;
	highlightBackgroundColor?: Color;
	preferredBackgroundColor?: Color;
	preferredIndexColor?: Color;
	preferredTextColor?: Color;
	preferredCommentColor?: Color;
	indexColor?: Color;
	textColor?: Color;
	commentColor?: Color;
	indexFontSize?: number;
	textFontSize?: number;
	commentFontSize?: number;
};

export type CandidateStateButtonStyle = {
	backgroundStyle: Ref<CandidateStateButtonBackgroundStyle>;
	foregroundStyle: Refs<CandidateStateButtonForegroundStyle>;
};

export type CandidateStateButtonBackgroundStyle = {
	normalColor: string;
	highlightColor: string;
};

export type CandidateStateButtonForegroundStyle = {
	normalImage: string;
	highlightImage: string;
};

export type VerticalCandidateStyle = {
	insets?: Insets;
	backgroundStyle?: Ref<Style>;
};

export type VerticalCandidates = {
	type: "verticalCandidates";
	maxRows: number;
	separatorColor: "#33338888";
	backgroundStyle: Ref<Style>;
	candidateStyle: Ref<CandidateStyle>;
};

export type CandidateContextMenu = CandidateContextMenuItem[];

export type CandidateContextMenuItem = {
	name: string;
	action: Action;
};

// 键盘 Keyboard

export type KeyboardStyle = {
	backgroundStyle: Ref<Style>;
};

export type LayoutElement = CellReference | HStack | VStack;

export type CellReference = {
	Cell: Ref<Cell>;
};

export type HStack = {
	HStack: {
		subviews: LayoutElement[];
		style?: Ref<StackStyle>;
	};
};

export type VStack = {
	VStack: {
		subviews: LayoutElement[];
		style?: Ref<StackStyle>;
	};
};

export type StackStyle = {
	size: Size;
};

export type Cell = {
	size?: Size;
	bounds?: Bounds;
	backgroundStyle?: BackgroundStyle;
	foregroundStyle: ForegroundStyle;
	uppercasedStateForegroundStyle?: ForegroundStyle;
	capsLockedStateForegroundStyle?: ForegroundStyle;
	hintStyle?: HintStyle;
	hintSymbolsStyle?: HoldSymbolsStyle;

	action?: Action;
	repeatAction?: Action;
	uppercasedStateAction?: Action;
	swipeUpAction?: Action;
	swipeDownAction?: Action;
	animation?: AnimationConfig;
	notification?: NotificationStyle;
};

export type HintStyle = {
	insets?: Insets;
	backgroundStyle?: string;
	foregroundStyle?: string;
	swipeUpForegroundStyle?: string;
	swipeDownForegroundStyle?: string;
	swipeLeftForegroundStyle?: string;
	swipeRightForegroundStyle?: string;
};

export type HoldSymbolsStyle = {
	insets?: Insets;
	backgroundStyle: string;
	foregroundStyle: string[];
	actions: Action[];
	selectedStyle?: string;
	selectedIndex?: number;
	symbolWidth?: number | string;
};

export type CollectionCellStyle = {
	backgroundStyle: string;
	foregroundStyle: string;
};

/*** 行为 ***/

export type Action =
	| PrimitiveAction
	| {
			character: string;
	  }
	| {
			symbol: string;
	  }
	| {
			sendKeys: string;
	  }
	| {
			openURL: string;
	  }
	| {
			runScript: string;
	  }
	| {
			keyboardType:
				| "pinyin"
				| "alphabetic"
				| "numeric"
				| "symbolic"
				| "emojis"
				| string;
	  }
	| {
			shortcut: string;
	  }
	| {
			switchRimeSchema: string;
	  };

export type PrimitiveAction =
	| "space"
	| "enter"
	| "tab"
	| "shift"
	| "backspace"
	| "dismissKeyboard"
	| "moveCursorBackward"
	| "moveCursorForward"
	| "returnPrimaryKeyboard"
	| "returnLastKeyboard"
	| "symbolicKeyboardLockStateToggle"
	| "settings"
	| "nextKeyboard";

/*** 动画 ***/

export type AnimationConfig = BoundsAnimation | APNGAnimation | EmitAnimation;

export type BoundsAnimation = {
	type: "bounds";
	duration: number;
	fromScale: number;
	toScale: number;
	repeatCount?: number;
};

export type APNGAnimation = {
	type: "apng";
	file: string;
	targetScale?: number;
	useCellVisibleSize?: boolean;
	zPosition?: number | "above" | "below";
};

export type EmitAnimation = {
	type: "emit";
	file: string[];
	duration: number;
	targetScale?: number;
	enableRandomImage?: boolean;
	randomPositionX?: number;
	randomPositionY?: number;
	rotationBegin?: number;
	rotationEnd?: number;
	randomRotation?: number;
	alphaBegin?: number;
	alphaEnd?: number;
};

// 通用定义

export type Ref<_> = string;

export type Refs<T> = Ref<T> | Ref<T>[];

export type Height = number | `${string}vh`;

export type Color = string;

export type FontSize = number | string;

export type TargetScale = number | { x: number; y: number };

export type Layout = LayoutElement[];

export type ContentMode =
	| "center"
	| "scaleToFill"
	| "scaleAspectFit"
	| "scaleAspectFill";

export type ExternalImage = {
	file: string;
	image: string;
};

export type Insets = {
	top?: number;
	bottom?: number;
	left?: number;
	right?: number;
};

export type Size = {
	width?: number | { percentage: number } | string;
	height?: number | { percentage: number } | string;
};

export type Bounds = Size & {
	alignment?:
		| "center"
		| "centerTop"
		| "centerBottom"
		| "left"
		| "right"
		| "leftTop"
		| "leftBottom"
		| "rightTop"
		| "rightBottom";
};

export type Point = {
	x: number;
	y: number;
};

export type Center = Partial<Point>;

export type FontWeight =
	| "ultralight"
	| "thin"
	| "light"
	| "regular"
	| "medium"
	| "semibold"
	| "bold"
	| "heavy"
	| "black";

export type BackgroundStyle = Ref<Style>;

export type ForegroundStyle = Ref<Style> | Refs<Style>;

export type Style =
	| TextStyle
	| GeometryStyle
	| SystemImageStyle
	| AssetImageStyle
	| FileImageStyle;

export type TextStyle = {
	buttonStyleType: "text";
	text: string;
	fontSize?: number;
	fontWeight?: FontWeight;
	normalColor: string;
	highlightColor?: string;
	center?: Center;
};

export type GeometryStyle = {
	buttonStyleType: "geometry";
	insets?: Insets;
	normalColor: string;
	highlightColor?: string;
	colorLocation?: number[];
	colorStartPoint?: Point;
	colorEndPoint?: Point;
	colorGradientType?: "axial" | "conic" | "radial";
	cornerRadius?: number;
	borderSize?: number;
	normalBorderColor?: string;
	highlightBorderColor?: string;
	normalLowerEdgeColor?: string;
	highlightLowerEdgeColor?: string;
	normalShadowColor?: string;
	highlightShadowColor?: string;
	shadowOpacity?: number;
	shadowRadius?: number;
	shadowOffset?: Point;
	animation?: Ref<AnimationConfig>;
};

// 平台映射中的 Android 图标名使用 Material Icon 名称，不加 material: 前缀。
export type SystemImageName = string | { ios?: string; android?: string };

export type SystemImageStyle = {
	buttonStyleType: "systemImage";
	systemImageName: SystemImageName;
	highlightSystemImageName?: SystemImageName;
	contentMode?: ContentMode;
	fontSize?: number;
	fontWeight?: FontWeight;
	normalColor: string;
	highlightColor?: string;
};

export type AssetImageStyle = {
	buttonStyleType: "assetImage";
	assetImageName: string;
	contentMode?: ContentMode;
	normalColor: string;
	highlightColor?: string;
};

export type FileImageStyle = {
	buttonStyleType: "fileImage";
	insets?: Insets;
	contentMode?: ContentMode;
	normalImage: ExternalImage;
	highlightImage?: ExternalImage;
};

/*** 通知 */

export type NotificationStyle = string | string[];

export type NotificationType = "rime" | "keyboardAction" | "returnKeyType";

/*** 图片描述文件 ***/

export type ImageDescriptionFile = Record<
	string,
	{
		rect: {
			x: number;
			y: number;
			width: number;
			height: number;
		};
		insets: Insets;
	}
>;

/*** 数据源 ***/

export type DataSourceValue = string | { label: string; value: string };
export type DataSource = Record<string, DataSourceValue[]>;

type Collection = Record<string, unknown>;

// 保留 iOS 的 SF Symbols，为 Android 显式指定对应的 Material Icon。
// https://ihsiao.com/apps/hamster/v3/docs/guides/skins/styles/#systemimage
const materialIcons: Record<string, string> = {
	globe: "language",
	shift: "shift",
	"delete.left": "backspace",
	return: "keyboard_return",
	"r.circle": "settings",
	"chevron.down.circle": "expand_circle_down",
	"characters.uppercase": "match_case",
	character: "language_pinyin",
	function: "functions",
	"doc.on.clipboard": "content_paste",
	"text.quote": "text_snippet",
	"chevron.forward": "chevron_right",
	"chevron.down": "expand_more",
	"chevron.up": "expand_less",
};

function systemImageName(ios: string): SystemImageName {
	const android = materialIcons[ios];
	if (!android) throw new Error(`缺少 Android 图标映射：${ios}`);
	return { ios, android };
}

function parseAction(raw: string, symbol?: boolean): Action {
	if (raw.length === 1) {
		return symbol ? { symbol: raw } : { character: raw };
	} else if (raw.startsWith("#")) {
		return { shortcut: raw };
	} else if (raw.startsWith("*")) {
		return { sendKeys: raw.slice(1) };
	} else if (raw.startsWith("!")) {
		return { keyboardType: raw.slice(1) };
	} else {
		return raw as Action;
	}
}

function makeKeyboardLayoutStyles(config: Config): Collection {
	const baseColor = config.dark ? "707070" : "f7f7f7";
	const altColor = config.dark ? "4c4c4c" : "e7e7e7";
	const mainBackground: GeometryStyle = {
		buttonStyleType: "geometry",
		insets: { left: 2, right: 2, top: 2, bottom: 2 },
		normalColor: baseColor,
		highlightColor: altColor,
		cornerRadius: 2,
	};
	const fnBackground: GeometryStyle = {
		...mainBackground,
		normalColor: altColor,
		highlightColor: baseColor,
	};
	const styles: Collection = { mainBackground, fnBackground };
	// 无刻只隐藏颜色，保留与有刻相同的前景层和按键状态。
	const mainColor = config.label
		? config.dark
			? "ffffff"
			: "000000"
		: "00000000";
	const mainLabel: Omit<TextStyle, "text"> = {
		buttonStyleType: "text",
		normalColor: mainColor,
		highlightColor: mainColor,
		fontSize: 20,
		fontWeight: "regular",
		center: { y: 0.45 },
	};
	const fnLabel: Omit<SystemImageStyle, "systemImageName"> = {
		buttonStyleType: "systemImage",
		normalColor: mainColor,
		highlightColor: mainColor,
		fontSize: 16,
	};
	const swipeColor = config.label
		? config.dark
			? "e5e5e5"
			: "575757"
		: "00000000";
	const upSwipe: Omit<TextStyle, "text"> = {
		buttonStyleType: "text",
		normalColor: swipeColor,
		highlightColor: swipeColor,
		fontSize: 10,
		fontWeight: "regular",
		center: { y: 0.2 },
	};
	const downSwipe: Omit<TextStyle, "text"> = {
		...upSwipe,
		center: { y: 0.8 },
	};
	for (const [index, color] of rainbow.entries()) {
		const baseColor = config.dark ? color.dark : color.light;
		const altColor = config.dark ? color.dark2 : color.light2;
		const backgroundStyle: GeometryStyle = {
			...structuredClone(mainBackground),
			normalColor: baseColor,
			highlightColor: altColor,
		};
		styles[`color${index}`] = backgroundStyle;
		const altBackgroundStyle: GeometryStyle = {
			...structuredClone(mainBackground),
			normalColor: altColor,
			highlightColor: baseColor,
		};
		styles[`color${index}Alt`] = altBackgroundStyle;
	}
	for (const row of config.keyInfos) {
		for (const [keyIndex, key] of row.entries()) {
			const isCharacter = key.action.length === 1;
			const isAlphabet = /^[a-zA-Z]$/.test(key.action);
			const name = key.name ?? key.action;
			const action = parseAction(key.action, config.symbol);
			const foregroundStyle: string[] = [];
			if (action !== "space") {
				// label
				const labelName = `${name}Label`;
				foregroundStyle.push(labelName);
				if (isCharacter) {
					styles[labelName] = {
						...structuredClone(mainLabel),
						text: key.label ?? key.action,
					};
				} else {
					styles[labelName] = {
						...structuredClone(fnLabel),
						systemImageName: systemImageName(key.label ?? key.action),
					};
				}
			}
			let swipeUpAction: Action | undefined;
			let swipeDownAction: Action | undefined;
			if (key.up || isAlphabet) {
				const up = key.up ?? key.action.toUpperCase();
				const swipeUpName = `${name}SwipeUp`;
				foregroundStyle.push(swipeUpName);
				styles[swipeUpName] = {
					...structuredClone(upSwipe),
					text: key.upLabel ?? up,
				};
				swipeUpAction = parseAction(up, config.symbol);
			}
			if (key.down) {
				const swipeDownName = `${name}SwipeDown`;
				foregroundStyle.push(swipeDownName);
				styles[swipeDownName] = {
					...structuredClone(downSwipe),
					text: key.downLabel ?? key.down,
				};
				swipeDownAction = parseAction(key.down, config.symbol);
			}
			let backgroundStyle: string;
			if (isCharacter) {
				if (isAlphabet && config.colorful) {
					const specialCharacters = config.specialCharacters ?? "aeiou";
					backgroundStyle = specialCharacters.includes(key.action)
						? `color${keyIndex}Alt`
						: `color${keyIndex}`;
				} else {
					backgroundStyle = "mainBackground";
				}
			} else {
				backgroundStyle = "fnBackground";
			}
			const c: Cell = {
				size: { width: key.width ?? `1/${row.length}` },
				backgroundStyle,
				foregroundStyle,
				action,
				swipeUpAction,
				swipeDownAction,
			};
			if (isAlphabet) {
				const shiftName = `${name}Shift`;
				styles[shiftName] = {
					...structuredClone(mainLabel),
					text: key.action.toUpperCase(),
				};
				const foreground = [...c.foregroundStyle];
				foreground[0] = shiftName;
				c.uppercasedStateForegroundStyle = foreground;
				c.capsLockedStateForegroundStyle = structuredClone(foreground);
				c.uppercasedStateAction = parseAction(
					key.action.toUpperCase(),
					config.symbol,
				);
			}
			styles[name] = c;
		}
	}
	return styles;
}

function makeGeneralStyles(config: Config): Collection {
	const background: GeometryStyle = {
		buttonStyleType: "geometry",
		normalColor: config.dark ? "2C2C2C03" : "D1D1D1FC",
	};
	return { background };
}

function makePreeditStyle(config: Config): [PreeditStyle, Collection] {
	const preedit = {
		insets: { left: 1, right: 1, top: 1, bottom: 1 },
		backgroundStyle: "background",
		foregroundStyle: "preeditForeground",
	};
	const preeditForeground: TextStyle = {
		buttonStyleType: "text",
		normalColor: config.dark ? "ffffff" : "000000",
		fontSize: 16,
		fontWeight: "regular",
		text: "",
	};
	return [preedit, { preeditForeground }];
}

function makeToolbar(
	config: Config,
): [ToolbarStyle, LayoutElement[], Collection] {
	const buttonColor = config.dark ? "E5E5E5" : "575757";
	const toolbar: ToolbarStyle = {
		backgroundStyle: "background",
	};
	const cellBase = {
		backgroundStyle: "buttonBackground",
		size: { width: "1/7" },
	};
	const styleBase = {
		buttonStyleType: "systemImage",
		normalColor: buttonColor,
		highlightColor: buttonColor,
		fontSize: 16,
	} as const;
	const hamster: Cell = {
		foregroundStyle: "hamsterImage",
		action: { openURL: "hamster3://" },
		...cellBase,
	};
	const hamsterImage: SystemImageStyle = {
		systemImageName: systemImageName("r.circle"),
		...styleBase,
	};
	const dismiss: Cell = {
		foregroundStyle: "dismissImage",
		action: "dismissKeyboard",
		...cellBase,
	};
	const dismissImage: SystemImageStyle = {
		systemImageName: systemImageName("chevron.down.circle"),
		...styleBase,
	};
	const alphabetic: Cell = {
		foregroundStyle: "alphabeticImage",
		action: { keyboardType: "alphabetic" },
		...cellBase,
	};
	const alphabeticImage: SystemImageStyle = {
		systemImageName: systemImageName("characters.uppercase"),
		...styleBase,
	};
	const pinyin: Cell = {
		foregroundStyle: "pinyinImage",
		action: { keyboardType: "pinyin" },
		...cellBase,
	};
	const pinyinImage: SystemImageStyle = {
		systemImageName: systemImageName("character"),
		...styleBase,
	};
	const script: Cell = {
		foregroundStyle: "scriptImage",
		action: { shortcut: "#toggleScriptView" },
		...cellBase,
	};
	const scriptImage: SystemImageStyle = {
		systemImageName: systemImageName("function"),
		...styleBase,
	};
	const clipboard: Cell = {
		foregroundStyle: "clipboardImage",
		action: { shortcut: "#showPasteboardView" },
		...cellBase,
	};
	const clipboardImage: SystemImageStyle = {
		systemImageName: systemImageName("doc.on.clipboard"),
		...styleBase,
	};
	const phrase: Cell = {
		foregroundStyle: "phraseImage",
		action: { shortcut: "#showPhraseView" },
		...cellBase,
	};
	const phraseImage: SystemImageStyle = {
		systemImageName: systemImageName("text.quote"),
		...styleBase,
	};
	const styles = {
		hamster,
		hamsterImage,
		dismiss,
		dismissImage,
		alphabetic,
		alphabeticImage,
		pinyin,
		pinyinImage,
		script,
		scriptImage,
		clipboard,
		clipboardImage,
		phrase,
		phraseImage,
	};
	const toolbarLayout: LayoutElement[] = [
		{
			HStack: {
				subviews: [
					{ Cell: "hamster" },
					{ Cell: "phrase" },
					{ Cell: "clipboard" },
					{ Cell: "script" },
					{ Cell: "pinyin" },
					{ Cell: "alphabetic" },
					{ Cell: "dismiss" },
				],
			},
		},
	];
	return [toolbar, toolbarLayout, styles];
}

function makeCandidates(
	config: Config,
): [
	Pick<
		Keyboard,
		| "horizontalCandidatesStyle"
		| "horizontalCandidatesLayout"
		| "verticalCandidatesStyle"
		| "verticalCandidatesLayout"
		| "candidateContextMenu"
	>,
	Collection,
] {
	const backgroundColor = config.dark ? "000000" : "ffffff";
	const textColor = config.dark ? "ffffff" : "000000";
	const expandButton = {
		action: { shortcut: "#candidatesBarStateToggle" },
		foregroundStyle: "expandButtonForegroundStyle",
		size: { width: 44 },
	};
	const expandButtonForegroundStyle = {
		buttonStyleType: "systemImage",
		fontSize: 20,
		normalColor: textColor,
		highlightColor: textColor,
		systemImageName: systemImageName("chevron.forward"),
	};
	const horizontalCandidatesStyle: HorizontalCandidateStyle = {
		backgroundStyle: "background",
	};
	const horizontalCandidates = {
		candidateStyle: "horizontalCandidateStyle",
		type: "horizontalCandidates",
	};
	const horizontalCandidateStyle: CandidateStyle = {
		highlightBackgroundColor: backgroundColor,
		preferredBackgroundColor: backgroundColor,
		preferredIndexColor: textColor,
		preferredTextColor: textColor,
		preferredCommentColor: textColor,
		indexColor: textColor,
		textColor: textColor,
		commentColor: textColor,
		indexFontSize: 12,
		textFontSize: 16,
		commentFontSize: 14,
	};
	const horizontalCandidatesLayout: LayoutElement[] = [
		{
			HStack: {
				subviews: [{ Cell: "horizontalCandidates" }, { Cell: "expandButton" }],
			},
		},
	];
	const verticalCandidatesStyle: VerticalCandidateStyle = {
		backgroundStyle: "background",
	};
	const verticalCandidatesLayout: LayoutElement[] = [
		{ HStack: { subviews: [{ Cell: "verticalCandidates" }] } },
		{
			HStack: {
				style: "verticalLastRowStyle",
				subviews: [
					{ Cell: "verticalPageUpButtonStyle" },
					{ Cell: "verticalPageDownButtonStyle" },
					{ Cell: "verticalReturnButtonStyle" },
					{ Cell: "verticalBackspaceButtonStyle" },
				],
			},
		},
	];
	const verticalPageDownButtonStyle = {
		action: { shortcut: "#verticalCandidatesPageDown" },
		backgroundStyle: "systemButtonBackgroundStyle",
		foregroundStyle: "verticalPageDownButtonStyleForegroundStyle",
	};
	const verticalPageDownButtonStyleForegroundStyle = {
		buttonStyleType: "systemImage",
		fontSize: 20,
		highlightColor: textColor,
		normalColor: textColor,
		systemImageName: systemImageName("chevron.down"),
	};
	const verticalPageUpButtonStyle = {
		action: { shortcut: "#verticalCandidatesPageUp" },
		backgroundStyle: "systemButtonBackgroundStyle",
		foregroundStyle: "verticalPageUpButtonStyleForegroundStyle",
	};
	const verticalPageUpButtonStyleForegroundStyle = {
		buttonStyleType: "systemImage",
		fontSize: 20,
		normalColor: textColor,
		highlightColor: textColor,
		systemImageName: systemImageName("chevron.up"),
	};
	const verticalReturnButtonStyle = {
		action: { shortcut: "#candidatesBarStateToggle" },
		backgroundStyle: "systemButtonBackgroundStyle",
		foregroundStyle: "verticalReturnButtonStyleForegroundStyle",
	};
	const verticalReturnButtonStyleForegroundStyle = {
		buttonStyleType: "systemImage",
		fontSize: 20,
		normalColor: textColor,
		highlightColor: textColor,
		systemImageName: systemImageName("return"),
	};
	const verticalLastRowStyle = {
		size: { height: 45 },
	};
	const verticalCandidates = {
		candidateStyle: "verticalCandidateStyle",
		insets: { bottom: 8, left: 8, right: 8, top: 8 },
		maxColumns: 6,
		maxRows: 5,
		separatorColor: "#C6C6C8",
		type: "verticalCandidates",
	};
	const verticalCandidateStyle = {
		commentColor: textColor,
		commentFontSize: 14,
		highlightBackgroundColor: backgroundColor,
		indexColor: textColor,
		indexFontSize: 12,
		insets: { bottom: 4, left: 6, right: 6, top: 4 },
		preferredBackgroundColor: backgroundColor,
		preferredCommentColor: textColor,
		preferredIndexColor: textColor,
		preferredTextColor: textColor,
		textColor: textColor,
		textFontSize: 16,
	};
	const verticalBackspaceButtonStyle = {
		action: "backspace",
		backgroundStyle: "systemButtonBackgroundStyle",
		foregroundStyle: "verticalBackspaceButtonStyleForegroundStyle",
	};
	const verticalBackspaceButtonStyleForegroundStyle = {
		buttonStyleType: "systemImage",
		fontSize: 20,
		highlightColor: textColor,
		normalColor: textColor,
		systemImageName: systemImageName("delete.left"),
	};
	const candidateContextMenu: CandidateContextMenu = [
		{ name: "固定", action: { sendKeys: "Control+semicolon" } },
		{ name: "前移", action: { sendKeys: "Control+bracketleft" } },
		{ name: "后移", action: { sendKeys: "Control+bracketright" } },
		{ name: "加词", action: { sendKeys: "Control+apostrophe" } },
		{ name: "重置", action: { sendKeys: "Control+backslash" } },
	];
	const values = {
		horizontalCandidatesStyle,
		horizontalCandidatesLayout,
		verticalCandidatesStyle,
		verticalCandidatesLayout,
		candidateContextMenu,
	};
	const styles = {
		expandButton,
		expandButtonForegroundStyle,
		horizontalCandidates,
		horizontalCandidateStyle,
		verticalCandidates,
		verticalCandidateStyle,
		verticalLastRowStyle,
		verticalPageDownButtonStyle,
		verticalPageDownButtonStyleForegroundStyle,
		verticalPageUpButtonStyle,
		verticalPageUpButtonStyleForegroundStyle,
		verticalReturnButtonStyle,
		verticalReturnButtonStyleForegroundStyle,
		verticalBackspaceButtonStyle,
		verticalBackspaceButtonStyleForegroundStyle,
	};
	return [values, styles];
}

function makeKeyboardLayout(
	config: Config,
): [Layout, KeyboardStyle, Collection] {
	const styles: Collection = makeKeyboardLayoutStyles(config);
	const keyboardStyle: KeyboardStyle = {
		backgroundStyle: "backgroundOriginalStyle",
	};
	const keyboardLayout: Layout = config.keyInfos.map((row) => {
		return {
			HStack: { subviews: row.map((x) => ({ Cell: x.name ?? x.action })) },
		};
	});
	return [keyboardLayout, keyboardStyle, styles];
}

export function makeHamsterSkin(config: Config): Keyboard {
	const styles = makeGeneralStyles(config);
	const [preeditStyle, styles1] = makePreeditStyle(config);
	const [toolbarStyle, toolbarLayout, styles2] = makeToolbar(config);
	const [candidates, styles3] = makeCandidates(config);
	const [keyboardLayout, keyboardStyle, styles4] = makeKeyboardLayout(config);
	return {
		preeditHeight: 24,
		preeditStyle,
		toolbarHeight: 32,
		toolbarStyle,
		toolbarLayout,
		...candidates,
		keyboardHeight: 256,
		keyboardLayout,
		keyboardStyle,
		...styles,
		...styles1,
		...styles2,
		...styles3,
		...styles4,
	};
}

export function makeHamsterSkinConfig(
	name: string,
	keyboards: KeyboardCollection,
): HamsterSkinConfig {
	const make = (name: string): KeyboardConfig => ({
		iPhone: {
			portrait: name,
			landscape: name,
		},
		iPad: {
			portrait: name,
			landscape: name,
			floating: name,
		},
	});
	return {
		name,
		author: "谭淞宸 <i@tansongchen.com>",
		pinyin: make("pinyin"),
		numeric: "numeric" in keyboards ? make("numeric") : make("pinyin"),
		symbolic: "symbolic" in keyboards ? make("symbolic") : make("pinyin"),
		...Object.fromEntries(
			Object.keys(keyboards)
				.filter((key) => !["pinyin", "numeric", "symbolic"].includes(key))
				.map((key) => [key, make(key)]),
		),
	};
}

function escapeXml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

// 预览使用实际生成的按键样式；系统图标用文字替代，无需依赖 iOS 字体。
const iconLabels: Record<string, string> = {
	globe: "中/英",
	shift: "⇧",
	"delete.left": "⌫",
	return: "↵",
};

export function makeHamsterSkinPreview(config: Omit<Config, "dark">): Buffer {
	const width = 390;
	const header = 32;
	const height = 256;
	const panels = [false, true].map((dark, index) => {
		const skin = makeHamsterSkin({ ...config, dark });
		const parts = [
			`<g transform="translate(${index * width},0)">`,
			`<rect width="${width}" height="${header + height}" fill="${dark ? "#2c2c2c" : "#d1d1d1"}"/>`,
			`<text x="${width / 2}" y="22" fill="${dark ? "white" : "black"}" font-size="14" text-anchor="middle">${dark ? "暗色" : "浅色"}</text>`,
		];
		const rowHeight = height / config.keyInfos.length;
		for (const [rowIndex, row] of config.keyInfos.entries()) {
			let x = 0;
			const y = header + rowIndex * rowHeight;
			for (const key of row) {
				const cell = skin[key.name ?? key.action] as Cell;
				const [numerator, denominator] = (key.width ?? `1/${row.length}`)
					.split("/")
					.map(Number);
				const keyWidth = (width * numerator) / denominator;
				const background = skin[
					cell.backgroundStyle ?? "mainBackground"
				] as GeometryStyle;
				const color = background.normalColor.replace(/^#/, "");
				parts.push(
					`<rect x="${x + 2}" y="${y + 2}" width="${keyWidth - 4}" height="${rowHeight - 4}" rx="${background.cornerRadius}" fill="#${color}"/>`,
				);
				const foregrounds = Array.isArray(cell.foregroundStyle)
					? cell.foregroundStyle
					: [cell.foregroundStyle];
				for (const reference of foregrounds) {
					const style = skin[reference] as TextStyle | SystemImageStyle;
					const center =
						style.buttonStyleType === "text" ? style.center : undefined;
					const text =
						style.buttonStyleType === "text"
							? style.text
							: (iconLabels[key.label ?? key.action] ?? key.action);
					parts.push(
						`<text x="${x + keyWidth * (center?.x ?? 0.5)}" y="${y + rowHeight * (center?.y ?? 0.5)}" dy="0.35em" text-anchor="middle" font-size="${style.fontSize}" fill="#${style.normalColor.replace(/^#/, "")}">${escapeXml(text)}</text>`,
					);
				}
				x += keyWidth;
			}
		}
		return [...parts, "</g>"].join("");
	});
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 2}" height="${header + height}" font-family="sans-serif">${panels.join("")}</svg>`;
	return new Resvg(svg, { fitTo: { mode: "zoom", value: 2 } }).render().asPng();
}

export function generateHamsterSkin(
	prefix: string,
	name: string,
	keyboards: KeyboardCollection,
) {
	const folder = join(prefix, name);
	mkdirSync(folder, { recursive: true });
	const skinConfig = makeHamsterSkinConfig(name, keyboards);
	writeFileSync(join(folder, "config.yaml"), dump(skinConfig), "utf8");
	for (const dark of [false, true]) {
		const modeFolder = join(folder, dark ? "dark" : "light");
		mkdirSync(modeFolder, { recursive: true });
		for (const [key, config] of Object.entries(keyboards)) {
			const content = dump(makeHamsterSkin({ ...config, dark }), {
				flowLevel: 2,
			});
			const fileName = join(modeFolder, `${key}.yaml`);
			writeFileSync(fileName, content, "utf8");
		}
	}
	writeFileSync(
		join(folder, "demo.png"),
		makeHamsterSkinPreview(keyboards.pinyin),
	);

	// 从输出目录打包，将所有皮肤文件放在压缩包内的同名文件夹中。
	// 每次新建压缩包，避免 zip 更新旧包时残留已经删除的条目。
	const temporary = mkdtempSync(join(prefix, ".skin-"));
	try {
		const archive = join(temporary, "skin.cskin");
		execFileSync("zip", ["-qrX", archive, name, "-x", "*.DS_Store"], {
			cwd: prefix,
			stdio: "pipe",
		});
		renameSync(archive, join(prefix, `${name}.cskin`));
	} finally {
		rmSync(temporary, { recursive: true, force: true });
	}
}
