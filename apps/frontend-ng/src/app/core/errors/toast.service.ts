import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ng/shared/ui';
import { ApiError } from './api-error';

/** User-facing messages per ApiError code — keeps raw backend payloads out of the UI. */
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Unable to reach the server. Check your connection and try again.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: 'The requested item could not be found.',
  VALIDATION_ERROR: 'Please review the highlighted fields and try again.',
  BAD_REQUEST: 'Please review the highlighted fields and try again.',
  CONFLICT: 'That action conflicts with existing data.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again shortly.',
};

const FALLBACK = 'Something went wrong. Please try again.';

/** Map an ApiError to a user-facing message: a curated message per code, never the raw payload. */
export function toUserMessage(error: ApiError): string {
  return MESSAGES[error.code] ?? error.message ?? FALLBACK;
}

/**
 * Thin wrapper over `ion-toast` for success/error feedback. The one place that
 * touches ToastController — services and pages call this instead of building
 * toasts themselves. Maps {@link ApiError} to a friendly message.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = inject(ToastController);

  async success(message: string): Promise<void> {
    await this.present(message, 'success', 3000);
  }

  /** Show an error toast. Accepts an ApiError (mapped to a friendly message) or a plain string. */
  async error(error: ApiError | string): Promise<void> {
    const message = error instanceof ApiError ? toUserMessage(error) : error;
    await this.present(message, 'danger', 5000);
  }

  private async present(message: string, color: 'success' | 'danger', duration: number): Promise<void> {
    const toast = await this.toasts.create({ message, color, duration, position: 'top' });
    await toast.present();
  }
}
