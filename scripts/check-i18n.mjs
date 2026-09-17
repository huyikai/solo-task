#!/usr/bin/env node
// S5 i18n audit: no hardcoded CJK strings in components.
// Per Constitution v1.4.0 I18n stance + FR-008.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const excludeDirs = new Set(["i18n", "__tests__", "test", "pages"]); // pages/ = dev-only 工具页 (DesignPreview)
const cjk = /[一-鿿]/;

let violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!excludeDirs.has(entry)) walk(full);
      continue;
    }
    if (!/\.(tsx|ts)$/.test(entry)) continue;
    const lines = readFileSync(full, "utf8").split("\n");
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      // 排除纯注释行; 行尾注释的 CJK 不算违规 — 检查剥掉 // 注释后的代码
      const codeOnly = trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")
        ? ""
        : trimmed.replace(/\/\/.*$/, "");
      if (cjk.test(codeOnly)) {
        violations.push(`${full.replace(root + "/", "")}:${idx + 1}: ${trimmed.slice(0, 60)}`);
      }
    });
  }
}

walk(srcDir);

if (violations.length > 0) {
  console.error(`✗ i18n audit failed: ${violations.length} hardcoded CJK lines\n`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
} else {
  console.log("✓ i18n audit passed: no hardcoded CJK outside src/i18n/");
}
