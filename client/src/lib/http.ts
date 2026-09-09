export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
    public retryAfter: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    csrf?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: options.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined
          ? {'Content-Type': 'application/json'}
          : {}),
        ...(options.csrf ? {'X-CSRFToken': options.csrf} : {}),
      },
      ...(options.body !== undefined
        ? {body: JSON.stringify(options.body)}
        : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      'network',
      'The connection was interrupted. Your draft is still here. Try again when you’re connected.',
    );
  }
  if (response.status === 204) return undefined as T;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      'invalid_response',
      'Aura could not read the response. Please try again.',
    );
  }
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('Retry-After')) || null;
    throw new ApiError(
      response.status,
      data.error?.code ?? 'request_failed',
      response.status === 429
        ? `A little pause is needed. Try again${retryAfter ? ` in ${retryAfter} seconds` : ' shortly'}.`
        : (data.error?.message ?? 'Something went wrong. Please try again.'),
      data.error?.fields ?? {},
      retryAfter,
    );
  }
  return data as T;
}
export const messageFor = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
