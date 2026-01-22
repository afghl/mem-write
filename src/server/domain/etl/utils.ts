export const normalizeWhitespace = (value: string) =>
    value.replace(/\s+/g, ' ').replace(/\u0000/g, '').trim();

