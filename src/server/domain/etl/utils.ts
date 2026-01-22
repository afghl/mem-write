export const normalizeWhitespace = (value: string) =>
    value.replace(/\s+/g, ' ').replace(/\u0000/g, '').trim();

export const decodeHtmlEntities = (value: string) =>
    value
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');

