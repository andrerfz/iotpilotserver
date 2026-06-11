import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular/standalone';
import { ApiError } from './api-error';
import { ToastService, toUserMessage } from './toast.service';

interface CreatedToast {
  message: string;
  color: string;
  duration: number;
  position: string;
}

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
    TestBed.configureTestingModule({
      providers: [ToastService, { provide: ToastController, useValue: fakeController }],
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

  it('falls back to the backend message for an unmapped code', () => {
    expect(toUserMessage(new ApiError(418, 'TEAPOT', 'I am a teapot'))).toBe('I am a teapot');
  });

  it('maps known codes to curated copy', () => {
    expect(toUserMessage(new ApiError(0, 'NETWORK_ERROR', 'x'))).toMatch(/reach the server/i);
    expect(toUserMessage(new ApiError(401, 'UNAUTHORIZED', 'x'))).toMatch(/session has expired/i);
    expect(toUserMessage(new ApiError(400, 'VALIDATION_ERROR', 'x'))).toMatch(/highlighted fields/i);
  });
});
