import { describe, expect, it } from 'vitest'
import { renderAccountHtml } from './render-account-html.ts'

describe('renderAccountHtml', () => {
  it('wraps quoted evidence in a blockquote and leaves rendered-ref lines as ordinary markup', () => {
    const html = renderAccountHtml(`# Readable account

## Building blocks
- Event: Book borrowed

## Quoted evidence
> A member borrows a book
`)

    expect(html).toContain('<blockquote>')
    expect(html).toContain('A member borrows a book')
    const quotes = html.match(/<blockquote>[\s\S]*?<\/blockquote>/g) ?? []
    expect(quotes).toHaveLength(1)
    expect(quotes[0]).not.toContain('Event:')
    expect(html).toContain('Event: Book borrowed')
  })
})
