import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

interface Envelope {
  success: boolean;
  data: unknown;
  timestamp: string;
  meta?: unknown;
}

function isEnvelope(body: unknown): body is Envelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    'data' in body &&
    'timestamp' in body
  );
}

/**
 * Every backend success response is wrapped as { success, data, timestamp }
 * (see apps/backend/src/http/response.util.ts's send.ok()) — the OpenAPI spec's
 * generated types are already written assuming this gets stripped before
 * reaching component code (see packages/core/.../openapi/registry.ts: "No
 * envelope (the FE interceptor strips it)"), but no such interceptor existed
 * until now. Every call site had to manually reach for `res.data` (or silently
 * read undefined off the envelope itself when it forgot to) — this fixes the
 * root cause for every future endpoint instead of patching call sites one by one.
 *
 * Endpoints that attach extra envelope-level metadata (send.ok(res, data, meta))
 * — e.g. admin-logs' { data, meta: { pagination, filters } } — are left
 * untouched: those call sites already read the full envelope themselves
 * (meta lives outside `data`, so stripping to `data` would lose it).
 */
export const envelopeInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((event: HttpEvent<unknown>) => {
      if (!(event instanceof HttpResponse)) return event;
      const body = event.body;
      if (!isEnvelope(body) || body.meta !== undefined) return event;
      return event.clone({ body: body.data });
    }),
  );
