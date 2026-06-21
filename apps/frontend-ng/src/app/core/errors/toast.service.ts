import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ng/shared/ui';
import { ApiError } from './api-error';

const ERROR_KEY_MAP: Record<string, string> = {
  NETWORK_ERROR: 'errors.network',
  UNAUTHORIZED: 'errors.unauthorized',
  FORBIDDEN: 'errors.forbidden',
  NOT_FOUND: 'errors.not_found',
  VALIDATION_ERROR: 'errors.validation',
  BAD_REQUEST: 'errors.bad_request',
  CONFLICT: 'errors.conflict',
  TOO_MANY_REQUESTS: 'errors.too_many_requests',
  INTERNAL_ERROR: 'errors.internal',
  SERVICE_UNAVAILABLE: 'errors.service_unavailable',
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = inject(ToastController);
  private readonly translate = inject(TranslateService);

  async success(message: string): Promise<void> {
    await this.present(message, 'success', 3000);
  }

  async error(error: ApiError | string): Promise<void> {
    const message = error instanceof ApiError ? this.toApiMessage(error) : error;
    await this.present(message, 'danger', 5000);
  }

  private toApiMessage(error: ApiError): string {
    const key = ERROR_KEY_MAP[error.code];
    if (key) return this.translate.instant(key);
    return error.message ?? this.translate.instant('errors.fallback');
  }

  private async present(message: string, color: 'success' | 'danger', duration: number): Promise<void> {
    const toast = await this.toasts.create({ message, color, duration, position: 'top' });
    await toast.present();
  }
}
