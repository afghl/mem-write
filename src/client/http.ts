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
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const chunk = line.slice(5).trimStart();
        if (!chunk || chunk === '[DONE]') continue;
        onChunk(chunk);
      }
    }
  }
}
