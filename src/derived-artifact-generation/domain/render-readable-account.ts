import type { AccountBlock, AccountDocument, AccountInput } from './model.ts'

const kindWord = (kind: AccountBlock['kind']): 'Event' | 'Actor' | 'System' => {
  switch (kind) {
    case 'domain-event':
      return 'Event'
    case 'actor':
      return 'Actor'
    case 'system':
      return 'System'
  }
}

const blockLine = (block: AccountBlock): string => {
  const kind = kindWord(block.kind)
  return block.withdrawn ? `- ${kind} (withdrawn): ${block.label}` : `- ${kind}: ${block.label}`
}

const quoteLine = (text: string): string =>
  text.split('\n').map((line) => `> ${line}`).join('\n')

const toMarkdown = (input: AccountInput): string => {
  const scope = input.scope ?? '(not set)'
  const blocks = ['## Building blocks', ...input.blocks.map(blockLine)].join('\n')
  const quotes = ['## Quoted evidence', ...input.quotes.map((quote) => quoteLine(quote.text))].join(
    '\n',
  )
  return `# Readable account
Format: Big Picture
Narrators: ${String(input.narratorCount)}
Scope: ${scope}

## Coverage
- Stakeholder check: not run
- Chosen problem: not run
- Timeline and relations: not run

${blocks}

${quotes}
`
}

/**
 * Deterministic Markdown walk of the snapshot. Building-block lines are keyed
 * by id; quoted evidence is inserted verbatim and never follows a reword.
 */
export const renderReadableAccount = (input: AccountInput): AccountDocument => {
  const references = new Map(
    input.blocks.map((block) => [
      block.id,
      [{ kind: 'readable-account' as const, path: 'building-blocks' }],
    ]),
  )
  return { markdown: toMarkdown(input), references }
}
