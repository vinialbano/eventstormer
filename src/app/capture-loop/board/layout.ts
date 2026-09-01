/**
 * The board wall layout — a pure function, no Vue, no DOM (ADR-006: the board
 * renderer is framework-free and swappable). Slice 1 lays out the **backlog
 * only**: a titled frame top-left and its stickies flowed left→right,
 * top→bottom in fixed cells. The timeline, sequence arrows and pivotal bars are
 * slice 3 — `placed` and `arrows` are already in the return type so nothing
 * downstream changes shape when slice 3 fills them.
 */

export interface BoardBlockInput {
  id: string
  kind: string
  label: string
  withdrawn?: boolean | undefined
  speaker?: string | undefined
}

interface LayoutViewport {
  w: number
  h: number
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface StickyRect extends Rect {
  id: string
  kind: string
  label: string
  withdrawn: boolean
  /** Deterministic degrees of tilt, seeded from the id (−1.4°…1.1°). */
  tilt: number
  speaker?: string | undefined
}

interface BoardLayout {
  canvas: { w: number; h: number }
  frame: Rect & { label: string }
  /** The `time →` guide line, drawn hand-style by the renderer. */
  timeGuide: { x1: number; y1: number; x2: number; y2: number }
  backlog: StickyRect[]
  /** Slice 3. */
  placed: StickyRect[]
  /** Slice 3. */
  arrows: never[]
}

const WALL_INSET = 40
const CELL = 132
const GAP = 16
const FRAME_PAD = 16
const FRAME_TITLE_H = 30
const MAX_COLS = 3

/** A small deterministic hash → a stable per-sticky tilt so the wall does not
 * reshuffle on every render. */
export const tiltFor = (id: string): number => {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) hash = (Math.imul(hash, 31) + id.charCodeAt(index)) >>> 0
  return Math.round((-1.4 + (hash % 26) / 10) * 100) / 100
}

export const layoutBoard = (
  blocks: readonly BoardBlockInput[],
  viewport: LayoutViewport,
): BoardLayout => {
  const count = blocks.length
  const cols = count === 0 ? MAX_COLS : Math.min(MAX_COLS, count)
  const rows = count === 0 ? 1 : Math.ceil(count / MAX_COLS)

  const frameW = cols * CELL + (cols - 1) * GAP + FRAME_PAD * 2
  const frameH = FRAME_TITLE_H + rows * CELL + (rows - 1) * GAP + FRAME_PAD * 2
  const frameX = WALL_INSET
  const frameY = WALL_INSET

  const backlog: StickyRect[] = blocks.map((block, index) => ({
    id: block.id,
    kind: block.kind,
    label: block.label,
    withdrawn: block.withdrawn === true,
    speaker: block.speaker,
    x: frameX + FRAME_PAD + (index % MAX_COLS) * (CELL + GAP),
    y: frameY + FRAME_TITLE_H + FRAME_PAD + Math.floor(index / MAX_COLS) * (CELL + GAP),
    w: CELL,
    h: CELL,
    tilt: tiltFor(block.id),
  }))

  const canvasW = Math.max(viewport.w, frameX + frameW + WALL_INSET)
  const canvasH = Math.max(viewport.h, frameY + frameH + WALL_INSET)
  const guideY = frameY + 6

  return {
    canvas: { w: canvasW, h: canvasH },
    frame: { x: frameX, y: frameY, w: frameW, h: frameH, label: 'backlog' },
    timeGuide: {
      x1: Math.round(canvasW * 0.42),
      y1: guideY,
      x2: canvasW - WALL_INSET,
      y2: guideY,
    },
    backlog,
    placed: [],
    arrows: [],
  }
}
