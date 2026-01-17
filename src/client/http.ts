export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new HttpError(res.status, `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

type EventStreamOptions = {
  onChunk: (chunk: string) => void;
};

export async function fetchEventStream(
  input: RequestInfo,
  init: RequestInit | undefined,
  { onChunk }: EventStreamOptions,
) {
  const res = await fetch(input, init);
  if (!res.ok || !res.body) {
    throw new HttpError(res.status, `Stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      const dataLines: string[] = [];
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        // Preserve leading spaces in streamed tokens. Only strip the optional single space after "data:".
        const chunk = line.startsWith('data: ') ? line.slice(6) : line.slice(5);
        dataLines.push(chunk);
      }

      if (dataLines.length === 0) continue;
      const data = dataLines.join('\n');
      if (!data || data.trim() === '[DONE]') continue;
      onChunk(data);
    }
  }
}
