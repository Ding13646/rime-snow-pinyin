import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { load } from "js-yaml";

interface Replace {
	from: RegExp;
	to: string;
	derive?: boolean;
}

// 只展开指定的拼写规则节点，不应用用户补丁或整个方案的继承。
function readRules(
	schema: string,
	key: string,
	seen = new Set<string>(),
): string[] {
	const id = `${resolve(schema)}:${key}`;
	if (seen.has(id)) throw new Error(`拼写规则循环引用：${id}`);
	const chain = new Set(seen).add(id);
	let node: unknown = load(readFileSync(schema, "utf8"));
	for (const part of key.split("/").filter(Boolean)) {
		if (!node || typeof node !== "object") {
			throw new Error(`拼写规则节点不存在：${id}`);
		}
		node = (node as Record<string, unknown>)[part];
	}
	if (Array.isArray(node) && node.every((rule) => typeof rule === "string")) {
		return node;
	}
	if (node && typeof node === "object" && "__include" in node) {
		const { __include: include, __append: append = [] } = node as Record<
			string,
			unknown
		>;
		if (
			typeof include === "string" &&
			Array.isArray(append) &&
			append.every((rule) => typeof rule === "string")
		) {
			const colon = include.indexOf(":");
			const file =
				colon < 0 ? schema : resolve(dirname(schema), include.slice(0, colon));
			const path = colon < 0 ? include : include.slice(colon + 1);
			return [...readRules(file, path, chain), ...append];
		}
	}
	throw new Error(`拼写规则格式错误：${id}`);
}

function replace(code: string, rule: Replace) {
	return code.replaceAll(rule.from, (...args: unknown[]) => {
		const captures = args.slice(0, typeof args.at(-1) === "object" ? -3 : -2);
		// Boost/Rime 将不存在的捕获组替换为空；JS 的字符串替换会保留字面量 $1。
		return rule.to.replace(/\$(\d+)/g, (_, index: string) =>
			String(captures[Number(index)] ?? ""),
		);
	});
}

export class SpellingAlgebra {
	private rules: Replace[];

	// apply 沿用将 derive 当作 xform 的单结果计算；applyAll 保留全部分支。
	// 传入 derive: false 则忽略 derive 规则，只计算规范拼写。
	constructor(schema: string, key: string, options: { derive?: boolean } = {}) {
		const { derive = true } = options;
		const rules = readRules(schema, key);
		const parsed: Replace[] = [];
		rules.forEach((rule) => {
			const trimmed = rule.trim();
			const separator = trimmed.at(-1);
			if (!separator) return;
			const ruleParts = trimmed.split(separator);
			if (ruleParts[0] === "derive" && !derive) return;
			if (ruleParts[0] === "xform" || ruleParts[0] === "derive") {
				parsed.push({
					from: new RegExp(ruleParts[1], "g"),
					to: ruleParts[2],
					derive: ruleParts[0] === "derive",
				});
			} else if (ruleParts[0] === "xlit") {
				const fromList = [...ruleParts[1]];
				const toList = [...ruleParts[2]];
				fromList.forEach((from, i) => {
					parsed.push({
						from: new RegExp(from, "g"),
						to: toList[i],
					});
				});
			} else if (ruleParts[0] !== "abbrev") {
				throw new Error(`不支持的拼写规则：${rule}`);
			}
		});
		this.rules = parsed;
	}

	apply(code: string) {
		let final = code;
		for (const rule of this.rules) {
			final = replace(final, rule);
		}
		return final;
	}

	// 保留 derive 的所有分支；abbrev 不属于完整音节，沿用解析时忽略它的处理。
	applyAll(code: string) {
		let codes = new Set([code]);
		for (const rule of this.rules) {
			const next = new Set<string>();
			for (const value of codes) {
				if (rule.derive) next.add(value);
				next.add(replace(value, rule));
			}
			codes = next;
		}
		return [...codes];
	}
}
