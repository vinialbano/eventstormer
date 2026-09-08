import { describe, expect, it } from 'vitest'
import { MODEL_JSON_COLLECTION_CAP, ModelJson } from './model-json.ts'

const fullDocument = () => ({
  format: 'eventstormer.model' as const,
  formatVersion: 1 as const,
  renderedAt: '2026-09-05T10:00:00.000Z',
  boardPosition: 4,
  sessionRecordPosition: 12,
  workshop: {
    format: 'big-picture' as const,
    scope: 'Lending a book',
    narratorCount: 2,
    stakeholderCheck: { run: true, complete: false, absentNames: ['Dana'] },
    chosenProblem: {
      chosen: true,
      hotSpotId: 'h_1',
      label: 'Payment keeps timing out',
      qualification: 'firm' as const,
    },
  },
  buildingBlocks: [
    {
      id: 'e_1',
      kind: 'domain-event' as const,
      label: 'Loan recorded',
      withdrawn: false,
      placement: 'timeline' as const,
      pivotal: true,
      provenance: { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } },
    },
    {
      id: 'h_1',
      kind: 'hot-spot' as const,
      label: 'Payment keeps timing out',
      withdrawn: false,
      placement: 'backlog' as const,
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

describe('ModelJson', () => {
  it('parses a full document', () => {
    const result = ModelJson.safeParse(fullDocument())
    expect(result.success).toBe(true)
  })

  it('parses a minimal empty-model document', () => {
    const result = ModelJson.safeParse({
      format: 'eventstormer.model',
      formatVersion: 1,
      renderedAt: '2026-09-05T10:00:00.000Z',
      boardPosition: 0,
      sessionRecordPosition: 0,
      workshop: {
        format: 'big-picture',
        scope: null,
        narratorCount: 0,
        stakeholderCheck: { run: false },
        chosenProblem: { notRun: true },
      },
      buildingBlocks: [],
      follows: [],
      causedBy: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a foreign document (wrong format tag)', () => {
    const result = ModelJson.safeParse({ ...fullDocument(), format: 'openapi' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown top-level key', () => {
    const result = ModelJson.safeParse({ ...fullDocument(), extra: 'nope' })
    expect(result.success).toBe(false)
  })

  it('rejects formatVersion 2', () => {
    const result = ModelJson.safeParse({ ...fullDocument(), formatVersion: 2 })
    expect(result.success).toBe(false)
  })

  it('rejects a buildingBlocks array over the collection cap', () => {
    const block = fullDocument().buildingBlocks[0]
    const oversized = {
      ...fullDocument(),
      buildingBlocks: Array.from({ length: MODEL_JSON_COLLECTION_CAP + 1 }, () => block),
    }
    expect(ModelJson.safeParse(oversized).success).toBe(false)
  })

  it('rejects a follows array over the collection cap', () => {
    const oversized = {
      ...fullDocument(),
      follows: Array.from({ length: MODEL_JSON_COLLECTION_CAP + 1 }, () => ({
        predecessor: 'e_1',
        successor: 'e_2',
      })),
    }
    expect(ModelJson.safeParse(oversized).success).toBe(false)
  })
})
