import DOMPurify from 'dompurify'
import markdownit from 'markdown-it'

const parser = markdownit()

const section = (markdown: string, heading: string): string => {
  const start = markdown.indexOf(`## ${heading}`)
  if (start < 0) return ''
  const rest = markdown.slice(start + 3)
  const next = rest.search(/\n## /)
  return next < 0 ? markdown.slice(start) : markdown.slice(start, start + 3 + next)
}

/**
 * In-app reading order: her quoted story, then the wall, then the header.
 * Coverage that is still "not run" stays out of the drawer.
 */
const presentAccountMarkdown = (markdown: string): string => {
  const quotes = section(markdown, 'Quoted evidence').trim()
  const blocks = section(markdown, 'Building blocks').trim()
  const preamble = markdown
    .replace(/## Coverage[\s\S]*?(?=\n## |$)/, '')
    .replace(/## Quoted evidence[\s\S]*?(?=\n## |$)/, '')
    .replace(/## Building blocks[\s\S]*?(?=\n## |$)/, '')
    .trim()
  return [quotes, blocks, preamble].filter((part) => part.length > 0).join('\n\n')
}

/** markdown-it → DOMPurify.sanitize. Domain emits Markdown; the view sanitises. */
export const renderAccountHtml = (markdown: string): string =>
  DOMPurify.sanitize(parser.render(presentAccountMarkdown(markdown)))
