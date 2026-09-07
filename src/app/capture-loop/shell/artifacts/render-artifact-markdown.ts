import DOMPurify from 'dompurify'
import markdownit from 'markdown-it'

const parser = markdownit()

/**
 * markdown-it → DOMPurify.sanitize for the summary and transcript artifacts.
 * The server render is the only render — this formats the Markdown string the
 * route returned, verbatim, with no section surgery.
 */
export const renderArtifactMarkdown = (markdown: string): string =>
  DOMPurify.sanitize(parser.render(markdown))
