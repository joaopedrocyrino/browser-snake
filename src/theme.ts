import type { State, Theme } from './types'
import { PORTINARI } from './portinari'

export const THEME_KEY = 'snake:theme'

/**
 * The idea of this function is to detect which language should be rendered to the user
 * 
 * @param params
 * @returns {Theme}
 */
export const detectTheme = (params: URLSearchParams): Theme => {
    /**
     * check the query string
     */
    const themeUrl = params.get('theme')
    if (themeUrl) {
        const parsedThemeUrl = themeUrl.toLowerCase()
        if (parsedThemeUrl === 'dark' || parsedThemeUrl === 'light') return parsedThemeUrl
    }

    /**
     * Check the local storage theme
     */
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    /**
     * If its not a supported theme we just remove the local storage item
     */
    if (stored) localStorage.removeItem(THEME_KEY)

    return window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
}

export const applyTheme = (state: State) => {
    state.portinari = PORTINARI[state.theme]
    // All body/control CSS variables are declared per `body[data-theme="…"]`
    // in index.html — flipping the attribute is the whole stylesheet swap.
    document.body.dataset.theme = state.theme

    const themeBtn = document.getElementById('theme-toggle') as HTMLButtonElement

    if (themeBtn) {
        let content
        let ariaLabel

        if (state.theme === 'dark') {
            content = '☀'
            ariaLabel = 'Switch to light theme'
        } else {
            content = '☾'
            ariaLabel = 'Switch to dark theme'
        }

        themeBtn.textContent = content
        themeBtn.setAttribute(
            'aria-label',
            ariaLabel,
        )
    }
}

export const setTheme = (state: State, next: Theme) => {
    state.theme = next
    localStorage.setItem(THEME_KEY, next)
    applyTheme(state)
}

export const changeTheme = (state: State) => {
    setTheme(state, state.theme === 'dark' ? 'light' : 'dark')
}