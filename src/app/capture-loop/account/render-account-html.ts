import DOMPurify from 'dompurify'
import markdownit from 'markdown-it'

const parser = markdownit()

/** markdown-it → DOMPurify.sanitize. Domain emits Markdown; the view sanitises. */
export const renderAccountHtml = (markdown: string): string => DOMPurify.sanitize(parser.render(markdown))
