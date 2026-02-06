export type TextPatch = {
  pattern: string;
  replacement: string;
};

export type TextPatchResult = {
  content: string;
  applied: boolean;
  matchIndex?: number;
};

export const applyTextPatch = (content: string, patch: TextPatch): TextPatchResult => {
  const pattern = patch.pattern;
  if (!pattern) {
    return { content, applied: false };
  }

  const matchIndex = content.indexOf(pattern);
  if (matchIndex === -1) {
    return { content, applied: false };
  }

  const replacement = patch.replacement ?? '';
  const updated =
    content.slice(0, matchIndex) + replacement + content.slice(matchIndex + pattern.length);

  return { content: updated, applied: true, matchIndex };
};
