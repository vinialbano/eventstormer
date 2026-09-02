import { describe, expect, it } from 'vitest'
import {
  cycleLine,
  decodeDragged,
  dropSiteFromElement,
  encodeDragged,
  isCycleRejection,
  relationFromConnect,
  relationFromDrop,
} from './semantic-edit.ts'

describe('relationFromDrop', () => {
  it('places an event on an empty pane', () => {
    expect(relationFromDrop({ id: 'e1', kind: 'domain-event' }, { site: 'pane' })).toEqual({
      kind: 'place',
      target: 'e1',
    })
  })

  it('sequences a dragged event onto an event and links a cause onto an event', () => {
    expect(
      relationFromDrop({ id: 'e2', kind: 'domain-event' }, { site: 'event', id: 'e1' }),
    ).toEqual({ kind: 'sequence', predecessor: 'e1', successor: 'e2' })
    expect(relationFromDrop({ id: 'a1', kind: 'actor' }, { site: 'event', id: 'e1' })).toEqual({
      kind: 'link-cause',
      cause: 'a1',
      effect: 'e1',
    })
    expect(relationFromDrop({ id: 's1', kind: 'system' }, { site: 'event', id: 'e1' })).toEqual({
      kind: 'link-cause',
      cause: 's1',
      effect: 'e1',
    })
  })

  it('inserts a dragged event between a follows pair', () => {
    expect(
      relationFromDrop(
        { id: 'eM', kind: 'domain-event' },
        { site: 'edge', predecessor: 'eA', successor: 'eB' },
      ),
    ).toEqual({
      kind: 'insert-between',
      predecessor: 'eA',
      inserted: 'eM',
      successor: 'eB',
    })
  })

  it('ignores an actor dropped on the pane or an edge', () => {
    expect(relationFromDrop({ id: 'a1', kind: 'actor' }, { site: 'pane' })).toBeUndefined()
    expect(
      relationFromDrop(
        { id: 'a1', kind: 'actor' },
        { site: 'edge', predecessor: 'eA', successor: 'eB' },
      ),
    ).toBeUndefined()
  })
})

describe('relationFromConnect', () => {
  it('sequences source then target and ignores a self-loop', () => {
    expect(relationFromConnect('eA', 'eB')).toEqual({
      kind: 'sequence',
      predecessor: 'eA',
      successor: 'eB',
    })
    expect(relationFromConnect('eA', 'eA')).toBeUndefined()
  })
})

describe('dropSiteFromElement', () => {
  it('reads an event node, a follows edge, or the pane', () => {
    const event = document.createElement('div')
    event.setAttribute('data-event-id', 'eA')
    expect(dropSiteFromElement(event)).toEqual({ site: 'event', id: 'eA' })

    const edge = document.createElement('div')
    edge.className = 'vue-flow__edge'
    edge.setAttribute('data-id', 'eA>eB')
    const path = document.createElement('path')
    edge.append(path)
    expect(dropSiteFromElement(path)).toEqual({
      site: 'edge',
      predecessor: 'eA',
      successor: 'eB',
    })

    expect(dropSiteFromElement(document.createElement('div'))).toEqual({ site: 'pane' })
  })
})

describe('drag payload and cycle copy', () => {
  it('round-trips the dragged block and names a cycle from snapshot labels', () => {
    const encoded = encodeDragged({ id: 'e1', kind: 'domain-event' })
    expect(decodeDragged(encoded)).toEqual({ id: 'e1', kind: 'domain-event' })
    expect(decodeDragged('not-json')).toBeUndefined()
    expect(
      cycleLine(['eA', 'eB', 'eA'], new Map([['eA', 'Loan recorded'], ['eB', 'Book returned']])),
    ).toBe('That sequence would loop: Loan recorded → Book returned → Loan recorded.')
    expect(isCycleRejection({ error: 'cycle', path: ['eA', 'eB'] })).toBe(true)
    expect(isCycleRejection({ error: 'kind-permission' })).toBe(false)
  })
})
