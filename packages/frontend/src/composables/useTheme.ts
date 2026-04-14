import { computed, ref } from 'vue'

export const THEME_STORAGE_KEY = 'solo-task-theme'

export type ThemePreference = 'light' | 'dark' | 'system'

function readPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return 'light'
}

export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

export function applyResolvedTheme(resolved: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = resolved
}

const themePreference = ref<ThemePreference>(readPreference())

function syncFromStorage(): void {
  themePreference.value = readPreference()
  applyResolvedTheme(resolveTheme(themePreference.value))
}

let mediaListener: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null = null

/** Call once before mount; applies stored preference and listens for OS theme when mode is system */
export function initTheme(): void {
  syncFromStorage()

  if (mediaListener) return

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mediaListener = () => {
    if (readPreference() === 'system') syncFromStorage()
  }
  mq.addEventListener('change', mediaListener)
}

export function useTheme() {
  const resolvedTheme = computed(() => resolveTheme(themePreference.value))

  function setTheme(pref: ThemePreference): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref)
    } catch {
      /* ignore */
    }
    themePreference.value = pref
    applyResolvedTheme(resolveTheme(pref))
  }

  return {
    themePreference,
    resolvedTheme,
    setTheme,
  }
}
