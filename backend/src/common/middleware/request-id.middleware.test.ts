import { describe, expect, it, vi } from 'vitest';

import { RequestIdMiddleware } from './request-id.middleware';

function mockReq(headers: Record<string, string> = {}) {
  return { headers } as any;
}
function mockRes() {
  const res: any = {};
  res.setHeader = vi.fn();
  res.headers = {};
  return res;
}

describe('RequestIdMiddleware', () => {
  it('generates an x-request-id when the client does not send one (17.23)', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    new RequestIdMiddleware().use(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.requestId).toBeTruthy();
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
  });

  it('echoes an incoming x-request-id back (correlation)', () => {
    const req = mockReq({ 'x-request-id': 'client-supplied-id' });
    const res = mockRes();
    const next = vi.fn();
    new RequestIdMiddleware().use(req, res, next);
    expect(req.requestId).toBe('client-supplied-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'client-supplied-id');
  });

  it('truncates overlong request ids to 128 chars', () => {
    const req = mockReq({ 'x-request-id': 'x'.repeat(500) });
    const res = mockRes();
    new RequestIdMiddleware().use(req, res, vi.fn());
    expect(req.requestId.length).toBe(128);
  });
});
