import type { Result } from '~/plumbing/result.ts'
import type { FacilitationTurn, OpeningQuestion } from './turn-schema.ts'

/**
 * The `Facilitator` port — the one seam a scripted double is injected at (DESIGN
 * §6). The behaviour ACs are tested at the translation layer against the double;
 * real-model judgment quality is the Slice-5 eval.
 *
 * Both calls take pre-assembled prompt strings (`prompt.ts`, T14, builds them)
 * and return the parsed model output or a classified failure.
 */
export interface FacilitatorInput {
  instructions: string
  prompt: string
}

export type FacilitatorFailure =
  | { kind: 'provider-down' }
  | { kind: 'schema-invalid'; detail: string }

export interface Facilitator {
  interpret(input: FacilitatorInput): Promise<Result<FacilitationTurn, FacilitatorFailure>>
  askOpening(input: FacilitatorInput): Promise<Result<OpeningQuestion, FacilitatorFailure>>
}
