import { describe, expect, it } from 'vitest'
import { ModelJson } from './model-json.ts'
import { serialise, type SerialiseInput } from './serialise.ts'

const richInput = (): SerialiseInput => ({
  renderedAt: '2026-09-05T10:00:00.000Z',
  boardPosition: 7,
  sessionRecordPosition: 15,
  source: {
    format: 'big-picture',
    scope: 'Lending a book',
    narratorCount: 2,
    stakeholderCheck: { run: true, complete: false, absentNames: ['Dana'] },
    chosenProblem: {
      chosen: true,
      hotSpotId: 'h_1',
      label: 'Payment keeps timing out',
      qualification: 'firm',
    },
  },
  snapshot: {
    blocks: [
      {
        id: 'e_2',
        kind: 'domain-event',
        label: 'Book returned',
        withdrawn: false,
        placement: 'timeline',
        pivotal: false,
        provenance: { accepter: { name: 'Dana' } },
      },
      {
        id: 'e_1',
        kind: 'domain-event',
        label: 'Loan recorded',
        withdrawn: false,
        placement: 'timeline',
        pivotal: true,
        provenance: { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } },
      },
      {
        id: 'a_1',
        kind: 'actor',
        label: 'Member',
        withdrawn: false,
        placement: 'backlog',
        pivotal: false,
        provenance: { accepter: { name: 'Dana' } },
      },
      {
        id: 'h_1',
        kind: 'hot-spot',
        label: 'Payment keeps timing out',
        withdrawn: false,
        placement: 'backlog',
        pivotal: false,
        provenance: { accepter: { name: 'Dana' } },
        modelAffecting: true,
        annotates: 'e_1',
        resolved: true,
        reference: 'added a retry with backoff',
      },
    ],
    follows: [{ predecessor: 'e_1', successor: 'e_2' }],
    causedBy: [{ cause: 'a_1', effect: 'e_1' }],
  },
})

describe('serialise', () => {
  it('renders the golden document for a rich workshop', () => {
    expect(serialise(richInput())).toEqual({
      format: 'eventstormer.model',
      formatVersion: 1,
      renderedAt: '2026-09-05T10:00:00.000Z',
      boardPosition: 7,
      sessionRecordPosition: 15,
      workshop: {
        format: 'big-picture',
        scope: 'Lending a book',
        narratorCount: 2,
        stakeholderCheck: { run: true, complete: false, absentNames: ['Dana'] },
        chosenProblem: {
          chosen: true,
          hotSpotId: 'h_1',
          label: 'Payment keeps timing out',
          qualification: 'firm',
        },
      },
      buildingBlocks: [
        {
          id: 'a_1',
          kind: 'actor',
          label: 'Member',
          withdrawn: false,
          placement: 'backlog',
          pivotal: false,
          provenance: { accepter: { name: 'Dana' } },
        },
        {
          id: 'e_1',
          kind: 'domain-event',
          label: 'Loan recorded',
          withdrawn: false,
          placement: 'timeline',
          pivotal: true,
          provenance: { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } },
        },
        {
          id: 'e_2',
          kind: 'domain-event',
          label: 'Book returned',
          withdrawn: false,
          placement: 'timeline',
          pivotal: false,
          provenance: { accepter: { name: 'Dana' } },
        },
        {
          id: 'h_1',
          kind: 'hot-spot',
          label: 'Payment keeps timing out',
          withdrawn: false,
          placement: 'backlog',
          pivotal: false,
          provenance: { accepter: { name: 'Dana' } },
          modelAffecting: true,
          annotates: 'e_1',
          resolved: true,
          reference: 'added a retry with backoff',
        },
      ],
      follows: [{ predecessor: 'e_1', successor: 'e_2' }],
      causedBy: [{ cause: 'a_1', effect: 'e_1' }],
    })
  })

  it('is a valid ModelJson document', () => {
    expect(ModelJson.safeParse(serialise(richInput())).success).toBe(true)
  })

  it('emits byte-identical JSON for a snapshot and a reordered copy', () => {
    const ordered = richInput()
    const shuffled = richInput()
    shuffled.snapshot = {
      blocks: [...ordered.snapshot.blocks].reverse(),
      follows: [
        { predecessor: 'e_1', successor: 'e_2' },
        { predecessor: 'a_1', successor: 'e_1' },
      ].reverse(),
      causedBy: [...ordered.snapshot.causedBy].reverse(),
    }
    ordered.snapshot = {
      ...ordered.snapshot,
      follows: [
        { predecessor: 'a_1', successor: 'e_1' },
        { predecessor: 'e_1', successor: 'e_2' },
      ],
    }
    expect(JSON.stringify(serialise(shuffled))).toBe(JSON.stringify(serialise(ordered)))
  })

  it('carries no contribution-body substring into the document', () => {
    const body = 'The member walked up to the desk and asked to borrow a book'
    // A full ArtifactSource also carries `quotes` (contribution bodies + evidence
    // spans); serialise must never reach into them.
    const input = { ...richInput(), source: { ...richInput().source, quotes: [{ id: 'c_1', text: body }] } }
    expect(JSON.stringify(serialise(input as SerialiseInput))).not.toContain(body)
  })

  it('normalises an empty board to boardPosition 0 and stays a valid document', () => {
    const empty: SerialiseInput = {
      renderedAt: '2026-09-05T10:00:00.000Z',
      boardPosition: -1,
      sessionRecordPosition: 0,
      source: {
        format: 'big-picture',
        scope: null,
        narratorCount: 0,
        stakeholderCheck: { run: false },
        chosenProblem: { notRun: true },
      },
      snapshot: { blocks: [], follows: [], causedBy: [] },
    }
    const document = serialise(empty)
    expect(document.boardPosition).toBe(0)
    expect(document.buildingBlocks).toEqual([])
    expect(ModelJson.safeParse(document).success).toBe(true)
  })
})
