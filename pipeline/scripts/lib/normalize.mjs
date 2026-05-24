// Normalize a JD or JSON-extracted string for verbatim-quote comparison.
// Strips bullets/whitespace and collapses unicode-vs-ascii variants of
// quote marks and dashes that the LLM tends to flip silently.
export function normalize(s) {
  return (s || '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/['"‘’‚′“”„″]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
