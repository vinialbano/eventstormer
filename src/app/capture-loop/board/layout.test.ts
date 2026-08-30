import { describe, expect, it } from 'vitest'
import { layoutBoard, tiltFor } from './layout.ts'

const VIEWPORT = { w: 1280, h: 800 }

describe('layoutBoard', () => {
  it('lays out an empty backlog as a framed 3-wide outline and no stickies', () => {
    const layout = layoutBoard([], VIEWPORT)

    expect(layout.backlog).toEqual([])
    expect(layout.placed).toEqual([])
    expect(layout.arrows).toEqual([])
    // 3 cells + 2 gaps + 2 * 16 pad = 3*132 + 2*16 + 32 = 460
    expect(layout.frame).toEqual({ x: 40, y: 40, w: 460, h: 194, label: 'backlog' })
    expect(layout.canvas).toEqual({ w: 1280, h: 800 })
  })

  it('places N blocks as N stickies flowed 3-per-row inside the frame', () => {
    const blocks = Array.from({ length: 4 }, (_, i) => ({
      id: `b${String(i)}`,
      kind: 'domain-event',
      label: `Event ${String(i)}`,
    }))
    const layout = layoutBoard(blocks, VIEWPORT)

    expect(layout.backlog).toHaveLength(4)
    // first sticky: frame origin + title(30) + pad(16)
    expect(layout.backlog[0]).toMatchObject({ id: 'b0', x: 56, y: 86, w: 132, h: 132 })
    // third sticky in row 0, col 2: x = 56 + 2*(132+16) = 352
    expect(layout.backlog[2]).toMatchObject({ x: 352, y: 86 })
    // fourth wraps to row 1: x back to 56, y = 86 + 132 + 16 = 234
    expect(layout.backlog[3]).toMatchObject({ x: 56, y: 234 })
    // frame grew to two rows: 30 + 2*132 + 16 + 32 = 342
    expect(layout.frame.h).toBe(342)
  })

  it('grows the canvas past the viewport when the backlog frame overflows it', () => {
    const blocks = Array.from({ length: 30 }, (_, i) => ({ id: `b${String(i)}`, kind: 'domain-event', label: 'x' }))
    const layout = layoutBoard(blocks, { w: 400, h: 300 })
    expect(layout.canvas.w).toBeGreaterThan(400)
    expect(layout.canvas.h).toBeGreaterThan(300)
  })

  it('tilt is deterministic per id and within −1.4°…1.1°', () => {
    expect(tiltFor('b0')).toBe(tiltFor('b0'))
    for (const id of ['a', 'order-placed', 'xyz123', '']) {
      const t = tiltFor(id)
      expect(t).toBeGreaterThanOrEqual(-1.4)
      expect(t).toBeLessThanOrEqual(1.1)
    }
  })
})
