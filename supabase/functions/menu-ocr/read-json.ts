import { OcrError } from './contract.ts';

/** Bound both streamed bytes and total read time; Content-Length is not trusted. */
export async function readJson(message: Request | Response, maxBytes: number, timeoutMs: number): Promise<unknown> {
  const reader = message.body?.getReader();
  if (!reader) throw new OcrError('INVALID_INPUT', 400);
  const chunks: Uint8Array[] = []; let length = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new OcrError('REQUEST_TIMEOUT', 408));
      void reader.cancel().catch(() => {});
    }, timeoutMs);
  });
  try {
    while (true) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maxBytes) { void reader.cancel().catch(() => {}); throw new OcrError('PAYLOAD_TOO_LARGE', 413); }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (e) { if (e instanceof OcrError) throw e; throw new OcrError('INVALID_INPUT', 400); }
  finally { clearTimeout(timer); reader.releaseLock(); }
}
