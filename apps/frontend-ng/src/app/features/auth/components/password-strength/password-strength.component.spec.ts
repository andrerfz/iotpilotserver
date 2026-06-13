import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { PasswordStrengthComponent } from './password-strength.component';

async function setup(password: string) {
  return render(PasswordStrengthComponent, { inputs: { password } });
}

describe('PasswordStrengthComponent', () => {
  it('renders nothing when password is empty', async () => {
    const { container } = await setup('');
    expect(container.querySelector('.pwd-rules')).toBeFalsy();
  });

  it('renders 5 rules when password is non-empty', async () => {
    const { container } = await setup('abc');
    expect(container.querySelectorAll('.pwd-rule')).toHaveLength(5);
  });

  it('marks only the matching rules valid for a partial password', async () => {
    // 'abcABC123' — 9 chars: no length, has upper, lower, number; no special
    const { container } = await setup('abcABC123');
    const rules = container.querySelectorAll('.pwd-rule');
    const valid = Array.from(rules).filter((r) => r.classList.contains('pwd-rule--valid'));
    const invalid = Array.from(rules).filter((r) => !r.classList.contains('pwd-rule--valid'));
    expect(valid.length).toBe(3); // upper, lower, number
    expect(invalid.length).toBe(2); // length, special
  });

  it('marks all 5 rules valid for a fully compliant password', async () => {
    const { container } = await setup('ValidPassword12!');
    const rules = container.querySelectorAll('.pwd-rule');
    const allValid = Array.from(rules).every((r) => r.classList.contains('pwd-rule--valid'));
    expect(allValid).toBe(true);
  });
});
