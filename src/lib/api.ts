import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from './context';
export async function api(request: Request, handler: () => Promise<unknown>) {
  try {
    const origin = request.headers.get('origin');
    // Compare against the configured public origin; request.url can use an internal bind hostname.
    const expectedOrigin = new URL(process.env.APP_URL || request.url).origin;
    if (
      !['GET', 'HEAD'].includes(request.method) &&
      ((origin && origin !== expectedOrigin) ||
        request.headers.get('sec-fetch-site') === 'cross-site')
    )
      throw new ApiError(403, 'Invalid request origin');
    return NextResponse.json(await handler(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          error: error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; '),
        },
        { status: 400 },
      );
    // Never log request bodies or contact data.
    return NextResponse.json(
      { error: 'The operation could not be completed. Please retry.' },
      { status: 500 },
    );
  }
}
export async function jsonBody(request: Request, limit = 64 * 1024) {
  if (Number(request.headers.get('content-length') || 0) > limit)
    throw new ApiError(413, 'Request is too large');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Missing request');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new ApiError(413, 'Request is too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new ApiError(400, 'Invalid JSON');
  }
}
