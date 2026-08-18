import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML before it goes into `dangerouslySetInnerHTML`.
 * Blocks scripts, event handlers, iframes/objects and javascript: URLs while
 * keeping the formatting (headings, lists, tables, inline styles) used by the
 * AI-generated content and the rich editor.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'a', 'img', 'figure', 'figcaption', 'details', 'summary',
    ],
    ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan', 'start', 'type'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/(?:png|jpe?g|gif|webp|svg\+xml));|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'formaction', 'srcset'],
  });
}

/** Escapes text so it can be embedded in HTML safely. */
export function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
