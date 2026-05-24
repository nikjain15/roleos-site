// Minimal HTML → readable text converter using cheerio.
// Preserves paragraph and list structure; strips all other markup.

import * as cheerio from 'cheerio';

const BLOCK = new Set([
  'p', 'br', 'div', 'section', 'article', 'header', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'tr', 'table', 'thead', 'tbody'
]);

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export function htmlToText(html) {
  if (!html) return '';
  // Greenhouse and some other ATSs return HTML that is itself entity-encoded
  // (i.e. the API JSON contains `&lt;p&gt;...`). Decode before parsing so
  // cheerio actually sees the tags.
  const decoded = decodeEntities(html);
  const $ = cheerio.load(decoded);

  $('script, style, noscript').remove();

  $('br').replaceWith('\n');
  $('li').each((_, el) => {
    $(el).prepend('- ');
    $(el).append('\n');
  });
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    $el.prepend('\n\n## ');
    $el.append('\n');
  });
  $('p, div, section, article, blockquote, pre').each((_, el) => {
    $(el).append('\n\n');
  });

  let text = $.root().text();
  // Decode any leftover entities cheerio missed
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Collapse runs of whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
