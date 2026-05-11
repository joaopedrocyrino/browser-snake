import type { Lang, Aurelio } from './types'

export const AURELIO: Record<Lang, Aurelio> = {
    en: {
        hud: { score: 'Score', high: 'High' },
        title: 'Snake',
        startKbd: [
            'Press space to start',
            'Arrows / WASD to move',
            'P to pause'
        ],
        startTouch: [
            'Tap to start',
            'Swipe to move',
            'Tap to pause'
        ],
        gameOver: 'Game over',
        restartKbd: 'Press space to restart',
        restartTouch: 'Tap to restart',
        paused: 'Paused',
        resumeKbd: 'Press space to resume',
        resumeTouch: 'Tap to resume',
    },
    pt: {
        hud: { score: 'Pontos', high: 'Recorde' },
        title: 'Cobrinha',
        startKbd: [
            'Aperte espaço para iniciar',
            'Setas / WASD para mover',
            'P para pausar',
        ],
        startTouch: [
            'Toque para iniciar', 
            'Deslize para mover', 
            'Toque para pausar'
        ],
        gameOver: 'Fim de jogo',
        restartKbd: 'Aperte espaço para reniciar',
        restartTouch: 'Toque para reniciar',
        paused: 'Pausado',
        resumeKbd: 'Aperte espaço para continuar',
        resumeTouch: 'Toque para continuar',
    },
}
