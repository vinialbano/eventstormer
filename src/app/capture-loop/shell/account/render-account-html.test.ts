import { describe, expect, it } from 'vitest'
import { renderAccountHtml } from './render-account-html.ts'

// Suite: render-account-html
// Invariant: Markdown renders to safe HTML with quoted evidence blockquoted and hostile markup stripped.
// Boundary IN: renderAccountHtml pure function (markdown-it + DOMPurify).
// Boundary OUT: ReadableAccountDrawer mount and lazy fetch (CaptureScreen.test.ts).

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
    expect(html.indexOf('Quoted evidence')).toBeLessThan(html.indexOf('Building blocks'))
    expect(html).not.toContain('Stakeholder check')
    expect(html).not.toContain('Coverage')
  })

  it('strips script tags from malicious markdown', () => {
    const html = renderAccountHtml(`# Readable account

## Building blocks
- Event: <script>alert('xss')</script>Evil

## Quoted evidence
> <img src=x onerror="alert(1)">
`)

    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })
})
