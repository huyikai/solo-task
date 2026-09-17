import zhCN from "./zh-CN";

type Dict = Record<string, string>;

const dictionaries: Record<string, Dict> = {
  "zh-CN": zhCN,
};

let currentLocale = "zh-CN";

export function setLocale(locale: string) {
  if (dictionaries[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): string {
  return currentLocale;
}

export type I18nKey = keyof typeof zhCN;

export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale] ?? {};
  let text = dict[key];
  if (text === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] missing key: ${key}`);
    }
    return `<missing:${key}>`;
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
