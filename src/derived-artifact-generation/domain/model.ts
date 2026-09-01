import type { BuildingBlockId } from '~/plumbing/ids.ts'

export interface AccountBlock {
  id: BuildingBlockId
  kind: 'domain-event' | 'actor' | 'system'
  label: string
  withdrawn: boolean
  placement?: 'backlog' | 'timeline'
}

export interface AccountFollowsEdge {
  predecessor: BuildingBlockId
  successor: BuildingBlockId
}

export interface AccountCausedByEdge {
  cause: BuildingBlockId
  effect: BuildingBlockId
}

interface AccountQuote {
  id: string
  text: string
}

export interface AccountInput {
  position: number
  format: 'big-picture'
  scope: string | null
  narratorCount: number
  blocks: AccountBlock[]
  quotes: AccountQuote[]
  follows?: AccountFollowsEdge[]
  causedBy?: AccountCausedByEdge[]
}

export interface ReferenceSite {
  kind: 'readable-account' | 'follows' | 'caused-by'
  path: string
}

export interface AccountDocument {
  markdown: string
  references: ReadonlyMap<BuildingBlockId, readonly ReferenceSite[]>
}
