import type { BuildingBlockId } from '~/plumbing/ids.ts'

export interface AccountBlock {
  id: BuildingBlockId
  kind: 'domain-event' | 'actor' | 'system'
  label: string
  withdrawn: boolean
}

export interface AccountQuote {
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
}

export interface ReferenceSite {
  kind: 'readable-account'
  path: string
}

export interface AccountDocument {
  markdown: string
  references: ReadonlyMap<BuildingBlockId, readonly ReferenceSite[]>
}
