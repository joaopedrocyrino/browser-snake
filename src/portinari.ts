import type { Theme, Portinari } from './types'

export const PORTINARI: Record<Theme, Portinari> = {
    dark: {
        bg: '#000',
        grid: 'rgba(0, 255, 0, 0.06)',
        apple: '#ff3030',
        snakeHead: '#a0ffa0',
        snakeBody: '#00d000',
        text: '#00ff00',
        overlay: 'rgba(0, 0, 0, 0.7)',
    },
    light: {
        bg: '#f5f5f1',
        grid: 'rgba(0, 60, 0, 0.07)',
        apple: '#cc2a2a',
        snakeHead: '#3aa84a',
        snakeBody: '#226e2c',
        text: '#1a4d1a',
        overlay: 'rgba(245, 245, 241, 0.78)',
    },
}