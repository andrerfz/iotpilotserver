import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ng/shared/ui';
import { ApiError } from './api-error';
import { ToastService } from './toast.service';

interface CreatedToast {
  message: string;
  color: string;
  duration: number;
  position: string;
}

const TRANSLATE_MOCK: Record<string, string> = {
  'errors.network': 'Could not reach the server.',
  'errors.unauthorized': 'Your session has expired. Please log in again.',
  'errors.forbidden': "You don't have permission to do that.",
  'errors.validation': 'Please check the highlighted fields.',
};

describe('ToastService', () => {
  let created: CreatedToast[];
  let presented: number;
  let toast: ToastService;

  beforeEach(() => {
    created = [];
    presented = 0;
    const fakeController = {
      create: (opts: CreatedToast) => {
        created.push(opts);
        return Promise.resolve({ present: () => Promise.resolve((presented += 1)) });
      },
    };
    const fakeTranslate = {
      instant: (key: string) => TRANSLATE_MOCK[key] ?? key,
    };
    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: ToastController, useValue: fakeController },
        { provide: TranslateService, useValue: fakeTranslate },
      ],
    });
    toast = TestBed.inject(ToastService);
  });

  it('shows a success toast with the given message', async () => {
    await toast.success('Saved');
    expect(created[0]).toMatchObject({ message: 'Saved', color: 'success' });
    expect(presented).toBe(1);
  });

  it('maps an ApiError to its friendly message, not the raw payload', async () => {
    const err = new ApiError(403, 'FORBIDDEN', 'TenantAccessDeniedException: cross-tenant', [
      { raw: 'payload' },
    ]);
    await toast.error(err);
    expect(created[0].message).toBe("You don't have permission to do that.");
    expect(created[0].message).not.toContain('TenantAccessDeniedException');
    expect(created[0]).toMatchObject({ color: 'danger' });
  });

  it('passes a plain string error through unchanged', async () => {
    await toast.error('Custom failure');
    expect(created[0].message).toBe('Custom failure');
  });

  it('falls back to the backend message for an unmapped code', async () => {
    await toast.error(new ApiError(418, 'TEAPOT', 'I am a teapot'));
    expect(created[0].message).toBe('I am a teapot');
  });

  it('maps known codes to curated copy', async () => {
    await toast.error(new ApiError(0, 'NETWORK_ERROR', 'x'));
    expect(created[0].message).toMatch(/reach the server/i);

    await toast.error(new ApiError(401, 'UNAUTHORIZED', 'x'));
    expect(created[1].message).toMatch(/session has expired/i);

    await toast.error(new ApiError(400, 'VALIDATION_ERROR', 'x'));
    expect(created[2].message).toMatch(/highlighted fields/i);
  });
});
