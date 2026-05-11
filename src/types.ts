export type Theme = 'dark' | 'light'

export type Portinari = {
    bg: string
    grid: string
    apple: string
    snakeHead: string
    snakeBody: string
    text: string
    overlay: string
}

export type Lang = 'en' | 'pt'

export type Aurelio = {
    hud: { score: string; high: string }
    title: string
    startKbd: [string, string, string]
    startTouch: [string, string, string]
    gameOver: string
    restartKbd: string
    restartTouch: string
    paused: string
    resumeKbd: string
    resumeTouch: string
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export type Point = { x: number; y: number }

export type Status = 'start' | 'playing' | 'paused' | 'gameover'

export type State = {
    snake: Point[]
    apple: Point
    movement: Direction
    score: number
    highScore: number
    tickMs: number
    lastTick: number
    status: Status
    lang: Lang
    theme: Theme
    portinari: Portinari
    aurelio: Aurelio
}

export type GridState = {
    COLS: number
    ROWS: number
    W: number
    H: number
}
