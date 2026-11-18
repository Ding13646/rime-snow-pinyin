export interface Config {
	colorful: boolean;
	dark: boolean;
	label: boolean;
	symbol?: boolean;
	keyInfos: KeyInfo[][];
	specialCharacters?: string;
}

export interface KeyInfo {
	action: string;
	name?: string;
	label?: string;
	up?: string;
	upLabel?: string;
	down?: string;
	downLabel?: string;
	width?: string;
}

export type KeyboardType =
	| "pinyin"
	| "alphabetic"
	| "numeric"
	| "symbolic"
	| string;
export type KeyboardCollection = Record<KeyboardType, Omit<Config, "dark">>;
