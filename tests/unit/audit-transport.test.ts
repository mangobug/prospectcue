import { EventEmitter } from 'node:events';
import { beforeEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), get: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup }));
vi.mock('node:https', () => ({ default: { get: mocks.get } }));
import { resolvePublic, websiteFetcher } from '@/lib/audits/safe-fetch';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.lookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
});
function response(
  status = 200,
  headers: Record<string, string> = { 'content-type': 'text/html' },
  chunks = [Buffer.from('<html>Fixture</html>')],
) {
  mocks.get.mockImplementation((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & {
      destroy: (err: Error) => void;
    };
    req.destroy = (err) => {
      req.emit('error', err);
      req.emit('close');
    };
    queueMicrotask(() => {
      const res = Object.assign(new EventEmitter(), {
        statusCode: status,
        headers,
      });
      callback(res);
      for (const chunk of chunks) res.emit('data', chunk);
      res.emit('end');
      req.emit('close');
    });
    return req;
  });
}
it('blocks mixed public/private DNS answers before opening a connection', async () => {
  mocks.lookup.mockResolvedValue([
    { address: '8.8.8.8', family: 4 },
    { address: '127.0.0.1', family: 4 },
  ]);
  await expect(resolvePublic('business.com')).rejects.toThrow('non-public');
  expect(mocks.get).not.toHaveBeenCalled();
});
it('pins the validated address for the socket and sends no cookies or authorization', async () => {
  response();
  const fetcher = websiteFetcher();
  expect((await fetcher('https://business.com')).status).toBe(200);
  const options = mocks.get.mock.calls[0][1];
  const pinned = vi.fn();
  options.lookup('business.com', {}, pinned);
  expect(pinned).toHaveBeenCalledWith(null, '8.8.8.8', 4);
  expect(mocks.lookup).toHaveBeenCalledTimes(1);
  expect(options.headers.Cookie).toBeUndefined();
  expect(options.headers.Authorization).toBeUndefined();
});
it('rejects redirects to private addresses without connecting there', async () => {
  response(302, { location: 'http://169.254.169.254/latest/meta-data/' });
  await expect(websiteFetcher()('https://business.com')).rejects.toThrow(
    'public',
  );
  expect(mocks.get).toHaveBeenCalledTimes(1);
});
it('bounds response sizes and redirect loops', async () => {
  response(200, { 'content-type': 'text/html' }, [
    Buffer.alloc(4 * 1024 * 1024 + 1),
  ]);
  await expect(websiteFetcher()('https://business.com')).rejects.toThrow();
  mocks.get.mockClear();
  response(302, { location: 'https://business.com/loop' });
  await expect(websiteFetcher()('https://business.com')).rejects.toThrow(
    'too many',
  );
  expect(mocks.get).toHaveBeenCalledTimes(6);
});
