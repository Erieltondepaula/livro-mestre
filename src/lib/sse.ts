import { fnHeaders } from '@/lib/edgeFunctions';

/** Turns a failed edge-function response into a human message (never throws). */
export async function describeResponseError(resp: Response): Promise<string> {
  let detail = '';
  try {
    const raw = await resp.text();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        detail = parsed?.error || parsed?.message || '';
      } catch {
        detail = raw.slice(0, 200);
      }
    }
  } catch {
    // ignore body read failures
  }
  if (detail) return detail;
  if (resp.status === 401 || resp.status === 403) return 'Sessão expirada. Faça login novamente.';
  if (resp.status === 402) return 'Créditos de IA esgotados. Adicione créditos para continuar.';
  if (resp.status === 429) return 'Muitas solicitações. Aguarde alguns segundos e tente novamente.';
  if (resp.status >= 500) return 'O serviço de IA está indisponível no momento. Tente novamente.';
  return `Erro ${resp.status}`;
}

/**
 * Calls a streaming edge function and consumes the OpenAI-style SSE response.
 * Fixes the previous inline loops: `[DONE]` now stops the OUTER read loop (no
 * spinning until the server closes), the reader is always released, and
 * network/HTTP failures surface as readable errors.
 */
export async function streamChatCompletion(
  url: string,
  body: unknown,
  opts: { signal?: AbortSignal; onDelta?: (full: string, delta: string) => void } = {},
): Promise<string> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: await fnHeaders(),
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new Error('Falha de conexão com o serviço de IA. Verifique sua internet e tente novamente.');
  }

  if (!resp.ok) throw new Error(await describeResponseError(resp));
  if (!resp.body) throw new Error('Resposta vazia do serviço de IA.');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let finished = false;

  const consume = (json: string): boolean => {
    if (json === '[DONE]') return true;
    try {
      const delta = JSON.parse(json)?.choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        opts.onDelta?.(full, delta);
      }
    } catch {
      // ignore malformed chunk
    }
    return false;
  };

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        if (consume(line.slice(6).trim())) { finished = true; break; }
      }
    }

    if (!finished) {
      // flush trailing partial buffer
      for (const raw of buffer.split('\n')) {
        if (!raw.startsWith('data: ')) continue;
        if (consume(raw.slice(6).trim())) break;
      }
    }
  } finally {
    try { await reader.cancel(); } catch { /* already closed */ }
    reader.releaseLock?.();
  }

  return full;
}
