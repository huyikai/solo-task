import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

// design.md §1.1 "对比度约束" (v1.1.0): 一切用作文字颜色的 token 在其
// 语义表面上 ≥ 4.5:1 (WCAG AA normal text), 含状态徽标 warning/success
// 与 primary 按钮文字。直接解析 main.css 主题块做数学断言, 防止 token
// 阶梯被无意回退 (2026-09-18 评审: 浅色徽标曾全线 2.6-3.3:1)。

type Tokens = Record<string, string>;

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../styles/main.css"),
  "utf8",
);

function parseBlock(selector: string): Tokens {
  // 必须紧跟随 `{` 才算块头: [data-theme="dark"] 更早出现在文件头部的
  // @custom-variant 里, 单纯 indexOf 会解析到错误的块。
  const openRe = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`,
  );
  const header = openRe.exec(css);
  if (!header) throw new Error(`theme block not found: ${selector}`);
  const open = header.index + header[0].length - 1;
  let depth = 1;
  let i = open + 1;
  while (i < css.length && depth > 0) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") depth -= 1;
    i += 1;
  }
  const body = css.slice(open + 1, i - 1);
  const tokens: Tokens = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    tokens[m[1].slice(2)] = m[2].trim();
  }
  return tokens;
}

/** 解开一层 var() 引用链 (如 --text-muted: var(--muted-foreground))。 */
function resolveTokens(tokens: Tokens): Record<string, string> {
  const resolve = (name: string, seen: Set<string>): string => {
    if (seen.has(name)) return "";
    const raw = tokens[name];
    if (raw === undefined) return "";
    const m = raw.match(/^var\((--[\w-]+)\)$/);
    return m ? resolve(m[1].slice(2), new Set(seen).add(name)) : raw;
  };
  const out: Record<string, string> = {};
  for (const name of Object.keys(tokens)) out[name] = resolve(name, new Set());
  return out;
}

const light = resolveTokens({
  ...parseBlock(":root"),
  ...parseBlock('[data-theme="light"]'),
});
const dark = resolveTokens({
  ...parseBlock(':root:not([data-theme="light"])'),
  ...parseBlock('[data-theme="dark"]'),
});

function luminance(hex: string): number {
  const channels = hex.replace("#", "").match(/.{2}/g) ?? [];
  if (channels.length !== 3) return Number.NaN;
  const [r, g, b] = channels.map((c) => {
    const v = Number.parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  if (!Number.isFinite(l1) || !Number.isFinite(l2)) return Number.NaN;
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;

const cases = [
  ["foreground on background", "foreground", "background"],
  ["foreground on card", "foreground", "card"],
  ["muted-foreground on background", "muted-foreground", "background"],
  ["muted-foreground on card", "muted-foreground", "card"],
  ["text-subtle on background", "text-subtle", "background"],
  ["text-subtle on card", "text-subtle", "card"],
  ["status badge warning on card", "warning", "card"],
  ["status badge success on card", "success", "card"],
  ["primary label on primary fill", "primary-foreground", "primary"],
] as const;

describe.each(["light", "dark"] as const)(
  "design.md §1.1 对比度约束 (%s)",
  (theme) => {
    const tokens = theme === "light" ? light : dark;

    test.each(cases)("%s ≥ 4.5:1", (label, fg, bg) => {
      const ratio = contrast(tokens[fg], tokens[bg]);
      expect(
        Number.isFinite(ratio) && ratio >= AA,
        `${theme} ${label}: ${tokens[fg]} on ${tokens[bg]} = ${
          Number.isFinite(ratio) ? ratio.toFixed(2) : "parse-error"
        }:1 (design.md v1.1.0 AA sweep)`,
      ).toBe(true);
    });
  },
);
