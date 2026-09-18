// design-review screenshots: boots Vite, injects a mock Tauri IPC bridge
// with sample tasks, and captures the real app UI across states/themes.
// Reusable harness for future taste-skill reviews; outputs to
// /tmp/design-review/*.png (temp dir, rerun anytime).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/design-review";
mkdirSync(OUT, { recursive: true });

const now = "2026-09-19T08:00:00Z";
const sampleTasks = [
  { id: 5, title: "季度报告终版提交", description: "含 burndown 图", status: "doing", priority: "high", due_at: "2026-09-21T00:00:00Z", created_at: "2026-09-18T10:00:00Z", updated_at: now },
  { id: 4, title: "买牛奶", description: "", status: "todo", priority: "none", due_at: "2026-09-20T00:00:00Z", created_at: "2026-09-18T09:00:00Z", updated_at: now },
  { id: 3, title: "回复设计评审意见", description: "", status: "todo", priority: "med", due_at: null, created_at: "2026-09-17T15:00:00Z", updated_at: now },
  { id: 2, title: "预约牙医", description: "", status: "done", priority: "low", due_at: null, created_at: "2026-09-16T11:00:00Z", updated_at: now },
  { id: 1, title: "整理书桌", description: "", status: "todo", priority: "none", due_at: null, created_at: "2026-09-15T09:00:00Z", updated_at: now },
];

function startVite() {
  return new Promise((resolve) => {
    const proc = spawn("pnpm", ["dev", "--port", "1420", "--strictPort"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let ok = false;
    proc.stdout.on("data", (c) => {
      if (!ok && c.toString().includes("Local:")) { ok = true; resolve(proc); }
    });
    setTimeout(() => { if (!ok) { ok = true; resolve(proc); } }, 20000);
  });
}

const vite = await startVite();
for (let i = 0; i < 40; i++) {
  try { const r = await fetch("http://localhost:1420"); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1024, height: 720 },
  deviceScaleFactor: 2,
});
await ctx.addInitScript(([tasks]) => {
  const dispatch = {
    health_check: () => ({ ok: true }),
    list_tasks: () => tasks,
    get_preference: () => ({ key: "theme.mode", value: '"system"', updated_at: "2026-01-01T00:00:00Z" }),
    set_preference: () => null,
    create_task: () => tasks[0],
    update_task: () => tasks[0],
    set_task_status: () => tasks[0],
    delete_task: () => null,
  };
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd) => {
      const h = dispatch[cmd];
      if (!h) throw { variant: "unknown", message: `no mock for ${cmd}` };
      return h();
    },
    transformCallback: () => 0,
    unregisterCallback: () => {},
  };
}, [sampleTasks]);

const page = await ctx.newPage();
await page.goto("http://localhost:1420", { waitUntil: "networkidle" });

async function setTheme(mode) {
  await page.evaluate((m) => {
    if (m === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", m);
  }, mode);
  await page.waitForTimeout(200);
}

async function shot(name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("✓", name);
}

// S1/S2: list view with tasks, both themes
await page.waitForSelector('[data-testid="task-row"]');
await setTheme("light");
await shot("01-list-light");
await setTheme("dark");
await shot("02-list-dark");
await setTheme("light");

// S3: empty state
await page.evaluate(() => {
  // 再触发一次加载路径: 直接清空 mock 数据无法热刷, 用空数组重载页面太重。
  // 改为直接操作: 卸载任务行不行 — 简单起见单独开一页。
});
const emptyCtx = await browser.newContext({ viewport: { width: 1024, height: 720 }, deviceScaleFactor: 2 });
await emptyCtx.addInitScript(() => {
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd) => {
      if (cmd === "health_check") return { ok: true };
      if (cmd === "get_preference") return { key: "theme.mode", value: '"system"', updated_at: "2026-01-01T00:00:00Z" };
      if (cmd === "list_tasks") return [];
      return null;
    },
    transformCallback: () => 0,
    unregisterCallback: () => {},
  };
});
const emptyPage = await emptyCtx.newPage();
await emptyPage.goto("http://localhost:1420", { waitUntil: "networkidle" });
await emptyPage.waitForSelector("text=还没有任务");
await emptyPage.screenshot({ path: `${OUT}/03-empty-light.png` });
console.log("✓ 03-empty-light");
await emptyCtx.close();

// S4: create dialog
await page.click('text=新建任务');
await page.waitForSelector('[data-slot="dialog-content"]');
await shot("04-editor-light");

// S5: date picker open
await page.click('button:has-text("选择日期")');
await page.waitForSelector('[data-radix-popper-content-wrapper]');
await shot("05-calendar-light");
for (let i = 0; i < 2; i++) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
}
await page.waitForSelector('[data-slot="dialog-overlay"]', { state: "detached", timeout: 5000 }).catch(() => {});

// S6: delete confirm
await page.click('[data-testid="task-row"] button:has-text("删除")');
await page.waitForSelector('[role="dialog"]');
await shot("06-delete-confirm-light");
await page.keyboard.press("Escape");
await page.waitForSelector('[data-slot="dialog-overlay"]', { state: "detached", timeout: 5000 }).catch(() => {});

// S7: settings page (both themes)
await page.click('button[aria-label="设置"]');
await page.waitForSelector("text=外观");
await shot("07-settings-light");
await setTheme("dark");
await shot("08-settings-dark");

await browser.close();
vite.kill("SIGTERM");
console.log("done →", OUT);
