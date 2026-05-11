import { AURELIO } from './aurelio'
import type { Lang, State } from './types'

export const LANG_KEY = 'snake:lang'

/**
 * The idea of this function is to detect which language should be rendered to the user
 * 
 * @param params
 * @returns {Lang}
 */
export const detectLang = (params: URLSearchParams): Lang => {
    /**
     * check the query string
     */
    const langUrl = params.get('lang')
    if (langUrl) {
        const parsedLangUrl = langUrl.toLowerCase()
        if (parsedLangUrl === 'en' || parsedLangUrl === 'pt') return parsedLangUrl
    }

    /**
     * Check the local storage language
     */
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === 'en' || stored === 'pt') return stored
    /**
     * If its not a supported language we just remove the local storage item
     */
    if (stored) localStorage.removeItem(LANG_KEY)

    /**
     * check for the browser language (en as fallback)
     */
    return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

export const applyLang = (state: State) => {
    state.aurelio = AURELIO[state.lang]
    document.documentElement.lang = state.lang === 'pt' ? 'pt-BR' : 'en'

    const langBtn = document.getElementById('lang-toggle') as HTMLButtonElement

    if (langBtn) {
        let content
        let ariaLabel

        if (state.lang === 'pt') {
            content = 'PT'
            ariaLabel = 'Trocar para inglês'
        } else {
            content = 'EN'
            ariaLabel = 'Switch to Portuguese'
        }

        langBtn.textContent = content
        langBtn.setAttribute(
            'aria-label',
            ariaLabel,
        )
    }
}

export const setLang = (state: State, next: Lang) => {
    state.lang = next
    localStorage.setItem(LANG_KEY, next)
    applyLang(state)
}

export const changeLang = (state: State) => {
    setLang(state, state.lang === 'pt' ? 'en' : 'pt')
}