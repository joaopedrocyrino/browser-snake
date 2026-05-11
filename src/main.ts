import { AURELIO } from "./aurelio"
import { PORTINARI } from "./portinari"
import { fisherYates } from './fisherYates'
import { applyLang, changeLang, detectLang } from "./lang"
import { detectTheme, THEME_KEY, applyTheme, changeTheme } from "./theme"
import type { State, GridState, Direction, Point, Status } from "./types"

const CELL = 20
const MIN_COLS = 10
const MIN_ROWS = 10

const START_TICK_MS = 130
const MIN_TICK_MS = 60
const SPEEDUP_PER_APPLE = 2

const HIGH_KEY = (col: number, rows: number) => `snake:high:${col}x${rows}`

// Min finger travel (CSS px) before a touch is treated as a swipe instead of a tap.
const SWIPE_MIN_PX = 10

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const MOVEMENT: Record<Direction, (p: Point) => Point> = {
  up: (p) => ({ x: p.x, y: p.y - 1 }),
  down: (p) => ({ x: p.x, y: p.y + 1 }),
  left: (p) => ({ x: p.x - 1, y: p.y }),
  right: (p) => ({ x: p.x + 1, y: p.y }),
}

const DIRECTION: Record<string, Direction> = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right'
}

const OVERLAY: Record<Status, (center: Point, s: State, context: CanvasRenderingContext2D) => void> = {
  start: (center, s, context) => {
    context.font = '36px "Courier New", monospace'
    context.fillText(s.aurelio.title.toUpperCase(), center.x, center.y - 60)
    context.font = '13px "Courier New", monospace'
    const lines = isTouch ? s.aurelio.startTouch : s.aurelio.startKbd
    lines.forEach((line, i) => context.fillText(line.toUpperCase(), center.x, center.y + i * 22))
  },
  gameover: (center, s, context) => {
    context.font = '28px "Courier New", monospace'
    context.fillText(state.aurelio.gameOver.toUpperCase(), center.x, center.y - 30)
    context.font = '13px "Courier New", monospace'
    context.fillText(
      `${s.aurelio.hud.score.toUpperCase()} ${s.score}    ${s.aurelio.hud.high.toUpperCase()} ${s.highScore}`,
      center.x,
      center.y + 6,
    )
    context.fillText(
      isTouch ? s.aurelio.restartTouch.toUpperCase() : s.aurelio.restartKbd.toUpperCase(),
      center.x,
      center.y + 32,
    )
  },
  paused: (center, s, context) => {
    context.font = '28px "Courier New", monospace'
    context.fillText(s.aurelio.paused.toUpperCase(), center.x, center.y - 14)
    context.font = '13px "Courier New", monospace'
    context.fillText(
      isTouch ? s.aurelio.resumeTouch.toUpperCase() : s.aurelio.resumeKbd.toUpperCase(),
      center.x,
      center.y + 16,
    )
  },
  playing: () => { }
}

const isTouch = window?.matchMedia('(pointer: coarse)')?.matches
const params = new URLSearchParams(window.location.search)

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

/**
 * Offscreen canvas holding the bg + faint grid lines. Rebuilt only on
 * resize or theme change — drawn into the main canvas per frame as a
 * single drawImage call instead of looping ~70 lineTos.
 */
const gridCanvas = document.createElement('canvas')
const gridCtx = gridCanvas.getContext('2d')!

const gridState: GridState = {
  COLS: 10,
  ROWS: 10,
  W: 10 * CELL,
  H: 10 * CELL
}

const state: State = {
  snake: [],
  apple: { x: 0, y: 0 },
  movement: 'right',
  score: 0,
  highScore: 0,
  tickMs: START_TICK_MS,
  lastTick: 0,
  status: 'start',
  lang: detectLang(params),
  aurelio: AURELIO[detectLang(params)],
  theme: detectTheme(params),
  portinari: PORTINARI[detectTheme(params)]
}

/**
 * Render-loop driver. We don't redraw 60×/sec when nothing changed:
 *
 * - `dirty` is set by anything that visibly changes the scene (a tick, a
 *   status flip, theme/lang toggle, resize).
 * - `rafId` tracks an in-flight requestAnimationFrame so we don't stack
 *   duplicate scheduled callbacks.
 * - During `playing`, RAF stays alive (we need to drive ticks). Draw still
 *   only fires when dirty — drops paints from 60/sec to ~7/sec (tick rate).
 * - When not playing, RAF parks after one draw and only restarts when
 *   something calls `invalidate()`.
 */
let dirty = true
let rafId: number | null = null

const scheduleFrame = () => {
  if (rafId != null) return
  rafId = requestAnimationFrame(loop)
}

const invalidate = () => {
  dirty = true
  scheduleFrame()
}

const buildGridCache = () => {
  gridCanvas.width = gridState.W
  gridCanvas.height = gridState.H
  gridCtx.imageSmoothingEnabled = false
  gridCtx.fillStyle = state.portinari.bg
  gridCtx.fillRect(0, 0, gridState.W, gridState.H)
  gridCtx.strokeStyle = state.portinari.grid
  gridCtx.lineWidth = 1
  gridCtx.beginPath()
  for (let i = 1; i < gridState.COLS; i++) {
    gridCtx.moveTo(i * CELL + 0.5, 0)
    gridCtx.lineTo(i * CELL + 0.5, gridState.H)
  }
  for (let i = 1; i < gridState.ROWS; i++) {
    gridCtx.moveTo(0, i * CELL + 0.5)
    gridCtx.lineTo(gridState.W, i * CELL + 0.5)
  }
  gridCtx.stroke()
}

const spawnApple = () => {
  /**
   * transform the snake coordinates into single ids for each coordinate
   */
  const occupied = new Set(
    state.snake.map(segment => segment.y * gridState.COLS + segment.x)
  )

  const empty: Point[] = []
  for (let y = 0; y < gridState.ROWS; y++) {
    for (let x = 0; x < gridState.COLS; x++) {
      /**
       * check the occupied id, if not on the set, add it to empty
       */
      if (!occupied.has(y * gridState.COLS + x)) empty.push({ x, y })
    }
  }

  /**
   * perfect run => no more empty spaces
   */
  if (!empty.length) {
    state.status = 'gameover'
    return
  }

  const sortedEmpty = fisherYates(empty)

  state.apple = sortedEmpty[0]
}

const reset = () => {
  const cx = Math.floor(gridState.COLS / 2)
  const cy = Math.floor(gridState.ROWS / 2)
  state.snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ]
  state.movement = 'right'
  state.score = 0
  state.tickMs = START_TICK_MS
  spawnApple()
}

const inputDirection = (next: Direction) => {
  // if (state !== 'playing') return
  if (next === OPPOSITE[state.movement] || next === state.movement) return
  state.movement = next
}

const recomputeGrid = () => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  gridState.COLS = Math.max(MIN_COLS, Math.floor(vw / CELL))
  gridState.ROWS = Math.max(MIN_ROWS, Math.floor(vh / CELL))
  state.highScore = Number(localStorage.getItem(HIGH_KEY(gridState.COLS, gridState.ROWS)) ?? 0)
  gridState.W = gridState.COLS * CELL
  gridState.H = gridState.ROWS * CELL
  canvas.width = gridState.W
  canvas.height = gridState.H
  // Setting width/height resets every context property — re-apply the ones we care about.
  ctx.imageSmoothingEnabled = false
}

const applyResize = () => {
  recomputeGrid()
  buildGridCache()
  reset()
  state.status = 'start'
  invalidate()
}

const tick = () => {
  const head = state.snake[0]

  /**
   * calculate the new head coordinate
   */
  const headPoint = MOVEMENT[state.movement](head)

  /**
   * If hit the edge of the grid move the snake to opposite side of the grid
   */
  if (headPoint.x < 0) headPoint.x = gridState.COLS - 1
  else if (headPoint.x >= gridState.COLS) headPoint.x = 0
  if (headPoint.y < 0) headPoint.y = gridState.ROWS - 1
  else if (headPoint.y >= gridState.ROWS) headPoint.y = 0

  /**
   * If hit the snake, game over
   */
  if (state.snake.some((s) => s.x === headPoint.x && s.y === headPoint.y)) {
    state.status = 'gameover'
    return
  }

  /**
   * Add the new head coordinates
   */
  state.snake.unshift(headPoint)

  /**
   * Check if the apple was eaten, otherwise remove the tail coordinates
   */
  if (headPoint.x !== state.apple.x || headPoint.y !== state.apple.y) {
    state.snake.pop()
    return
  }

  /**
   * set the score
   */
  state.score++

  /**
   * check for a new high score
   */
  if (state.score > state.highScore) {
    state.highScore = state.score
    localStorage.setItem(HIGH_KEY(gridState.COLS, gridState.ROWS), String(state.highScore))
  }

  /**
   * make it faster to make it harder
   */
  if (state.tickMs > MIN_TICK_MS) state.tickMs -= SPEEDUP_PER_APPLE

  spawnApple()
}

const drawOverlay = () => {
  ctx.fillStyle = state.portinari.overlay
  ctx.fillRect(0, 0, gridState.W, gridState.H)
  ctx.fillStyle = state.portinari.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  OVERLAY[state.status]({ x: gridState.W / 2, y: gridState.H / 2 }, state, ctx)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
}

const draw = () => {
  // Single drawImage replaces the bg fill + ~70 lineTos for the grid.
  // Cache is rebuilt only on resize or theme change.
  ctx.drawImage(gridCanvas, 0, 0)

  // Apple
  ctx.fillStyle = state.portinari.apple
  ctx.fillRect(state.apple.x * CELL + 3, state.apple.y * CELL + 3, CELL - 6, CELL - 6)

  // Snake
  ctx.fillStyle = state.portinari.snakeHead
  const sHead = state.snake[0]
  ctx.fillRect(sHead.x * CELL + 1, sHead.y * CELL + 1, CELL - 2, CELL - 2)

  for (let i = 1; i < state.snake.length; i++) {
    const s = state.snake[i]
    ctx.fillStyle = state.portinari.snakeBody
    ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
  }

  // HUD
  ctx.fillStyle = state.portinari.text
  ctx.font = '14px "Courier New", monospace'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillText(`${state.aurelio.hud.score.toUpperCase()} ${state.score}`, 8, 8)
  ctx.textAlign = 'right'
  ctx.fillText(`${state.aurelio.hud.high.toUpperCase()} ${state.highScore}`, gridState.W - 8, 8)
  ctx.textAlign = 'left'

  if (state.status !== 'playing') drawOverlay()
}

/**
 * event listeners
 */

let resizeTimer: number | null = null
window.addEventListener('resize', () => {
  if (resizeTimer != null) window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(applyResize, 100)
})

const langBtn = document.getElementById('lang-toggle') as HTMLButtonElement
const themeBtn = document.getElementById('theme-toggle') as HTMLButtonElement

langBtn?.addEventListener('click', () => {
  changeLang(state)
  invalidate()
})
themeBtn?.addEventListener('click', () => {
  changeTheme(state)
  buildGridCache() // grid color depends on theme
  invalidate()
})

window
  .matchMedia('(prefers-color-scheme: light)')
  .addEventListener('change', (e) => {
    if (localStorage.getItem(THEME_KEY)) return
    state.theme = e.matches ? 'light' : 'dark'
    applyTheme(state)
    buildGridCache()
    invalidate()
  })

let touchStart: { x: number; y: number } | null = null

canvas.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length !== 1) return
    e.preventDefault()
    const t = e.touches[0]
    touchStart = { x: t.clientX, y: t.clientY }
  },
  { passive: false },
)

canvas.addEventListener(
  'touchend',
  (e) => {
    if (!touchStart) return
    e.preventDefault()
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.x
    const dy = t.clientY - touchStart.y
    const adx = Math.abs(dx)
    const ady = Math.abs(dy)
    touchStart = null

    if (adx < SWIPE_MIN_PX && ady < SWIPE_MIN_PX) {
      if (state.status === 'start' || state.status === 'gameover') {
        reset()
        state.status = 'playing'
      } else if (state.status === 'playing')
        state.status = 'paused'
      else if (state.status === 'paused')
        state.status = 'playing'

      invalidate()
      return
    }

    const next: Direction =
      adx > ady ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
    inputDirection(next)
  },
  { passive: false },
)

canvas.addEventListener('touchcancel', () => {
  touchStart = null
})

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase()
  const next: Direction | undefined = DIRECTION[k]

  if (next) {
    e.preventDefault()
    inputDirection(next)
    return
  }

  if (k === ' ') {
    e.preventDefault()
    if (state.status === 'start' || state.status === 'gameover') {
      reset()
      state.status = 'playing'
    }
    else if (state.status === 'paused') state.status = 'playing'

    invalidate()
  } else if (k === 'p' || k === 'escape') {
    e.preventDefault()
    if (state.status === 'playing')
      state.status = 'paused'
    else if (state.status === 'paused') state.status = 'playing'

    invalidate()
  }
})

// ---- Boot ----------------------------------------------------------------

// `function` (not `const`) so it's hoisted — scheduleFrame() can reference
// it from above in the file without TDZ.
function loop(timestamp: number) {
  rafId = null

  if (state.status === 'playing') {
    if (!state.lastTick) state.lastTick = timestamp

    if (timestamp - state.lastTick >= state.tickMs) {
      tick()
      state.lastTick = timestamp
      dirty = true
    }

    if (dirty) {
      draw()
      dirty = false
    }
    scheduleFrame() // keep alive — we need RAF to drive future ticks
    return
  }

  state.lastTick = 0
  if (dirty) {
    draw()
    dirty = false
  }
  // Park: don't schedule another frame. Resumes on next invalidate().
}

applyTheme(state)
applyLang(state)
recomputeGrid()
buildGridCache()
reset()
invalidate()
