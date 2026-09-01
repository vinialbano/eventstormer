import type { BuildingBlockId } from '~/plumbing/ids.ts'
import type { AccountDocument, ReferenceSite } from './model.ts'

/**
 * Rendered-reference sites for one building block. The wall sticky is not a
 * site; the account's building-blocks line is, and so are follows and
 * caused-by endpoints keyed by id. An unknown id yields an empty list.
 */
export const listReferences = (
  document: AccountDocument,
  blockId: BuildingBlockId,
): ReferenceSite[] => [...(document.references.get(blockId) ?? [])]
