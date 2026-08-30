import { z } from 'zod'

/** The minimal reference to a party acting on an operation. */
const PartyRef = z.object({
  name: z.string().min(1),
})

/**
 * Every operation carries an author (domain invariant). A human direct edit
 * (F06) has an `accepter` only; a facilitator-originated operation records both
 * the `proposer` (who suggested it) and the `accepter` (the human who accepted
 * it) — F01.
 */
export const Author = z.object({
  proposer: PartyRef.optional(),
  accepter: PartyRef,
})
