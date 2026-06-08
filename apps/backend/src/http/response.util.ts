import { Response } from 'express';
import { mapErrorToHttpStatus, extractErrorDetails } from '@iotpilot/core/shared/infrastructure/http/error-handler';

export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
  timestamp: string;
  meta?: Record<string, unknown>;
}

function ts(): string {
  return new Date().toISOString();
}

export function sendOk<T>(res: Response, data: T, meta?: Record<string, unknown>): void {
  const body: StandardApiResponse<T> = { success: true, data, timestamp: ts() };
  if (meta) body.meta = meta;
  res.status(200).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data, timestamp: ts() });
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  code?: string,
  details?: unknown,
): void {
  res.status(status).json({ success: false, error: message, code, details, timestamp: ts() });
}

export const send = {
  ok: sendOk,
  created: sendCreated,
  badRequest: (res: Response, message = 'Bad request', details?: unknown) =>
    sendError(res, 400, message, 'BAD_REQUEST', details),
  unauthorized: (res: Response, message = 'Authentication required') =>
    sendError(res, 401, message, 'UNAUTHORIZED'),
  forbidden: (res: Response, message = 'Access denied') =>
    sendError(res, 403, message, 'FORBIDDEN'),
  notFound: (res: Response, message = 'Resource not found') =>
    sendError(res, 404, message, 'NOT_FOUND'),
  conflict: (res: Response, message = 'Resource conflict') =>
    sendError(res, 409, message, 'CONFLICT'),
  tooManyRequests: (res: Response, message = 'Too many requests') =>
    sendError(res, 429, message, 'TOO_MANY_REQUESTS'),
  serviceUnavailable: (res: Response, message = 'Service unavailable') =>
    sendError(res, 503, message, 'SERVICE_UNAVAILABLE'),
  internalError: (res: Response, message = 'Internal server error') =>
    sendError(res, 500, message, 'INTERNAL_ERROR'),
  fromError: (res: Response, err: unknown): void => {
    const status = mapErrorToHttpStatus(err);
    const { message, code, details } = extractErrorDetails(err);
    sendError(res, status, message, code, details);
  },
};
