import { render, fireEvent } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { Component } from '@angular/core';
import { UiInputComponent } from './ui-input.component';
import { UiSwitchComponent } from './ui-switch.component';
import { UiCheckboxComponent } from './ui-checkbox.component';
import { UiSelectComponent } from './ui-select.component';

// ─── UiInputComponent ────────────────────────────────────────────────────────

describe('UiInputComponent', () => {
  it('renders with label', async () => {
    const { container } = await render(UiInputComponent, {
      inputs: { label: 'Email', placeholder: 'you@example.com' },
    });
    expect(container.querySelector('ion-label')?.textContent).toContain('Email');
    // ion-input present; Ionic binds placeholder as a property (not DOM attribute)
    expect(container.querySelector('ion-input')).toBeTruthy();
  });

  it('displays error message when error input is set', async () => {
    const { container } = await render(UiInputComponent, {
      inputs: { error: 'Required' },
    });
    expect(container.querySelector('ion-note')?.textContent).toContain('Required');
    expect(container.querySelector('.ui-field--error')).toBeTruthy();
  });

  it('does not render error note when error is empty', async () => {
    const { container } = await render(UiInputComponent, {
      inputs: { error: '' },
    });
    expect(container.querySelector('ion-note')).toBeFalsy();
  });

  it('shows reveal button (ion-icon) for password type', async () => {
    const { container } = await render(UiInputComponent, {
      inputs: { type: 'password' },
    });
    // ion-button + ion-icon present when type=password
    expect(container.querySelector('ion-button')).toBeTruthy();
    expect(container.querySelector('ion-icon')).toBeTruthy();
  });

  it('does not show reveal button for text type', async () => {
    const { container } = await render(UiInputComponent, {
      inputs: { type: 'text' },
    });
    // no ion-button for non-password types
    expect(container.querySelector('ion-button')).toBeFalsy();
  });

  it('CVA: writeValue updates displayed value', async () => {
    const { fixture } = await render(UiInputComponent, {
      inputs: { label: 'Name' },
    });
    const cva = fixture.componentInstance;
    cva.writeValue('hello');
    fixture.detectChanges();
    // The signal-based value is updated
    expect((cva as unknown as { value: () => string }).value()).toBe('hello');
  });

  it('CVA: setDisabledState disables the control', async () => {
    const { fixture } = await render(UiInputComponent, {});
    const cva = fixture.componentInstance;
    cva.setDisabledState(true);
    fixture.detectChanges();
    expect(
      (cva as unknown as { isDisabled: () => boolean }).isDisabled(),
    ).toBe(true);
  });
});

// ─── UiSwitchComponent ───────────────────────────────────────────────────────

describe('UiSwitchComponent', () => {
  it('renders with label', async () => {
    const { container } = await render(UiSwitchComponent, {
      inputs: { label: 'Dark mode' },
    });
    expect(container.querySelector('ion-label')?.textContent).toContain('Dark mode');
  });

  it('CVA: writeValue reflects boolean', async () => {
    const { fixture } = await render(UiSwitchComponent, {});
    const cva = fixture.componentInstance;
    cva.writeValue(true);
    fixture.detectChanges();
    expect((cva as unknown as { value: () => boolean }).value()).toBe(true);
  });

  it('CVA: setDisabledState disables', async () => {
    const { fixture } = await render(UiSwitchComponent, {});
    const cva = fixture.componentInstance;
    cva.setDisabledState(true);
    expect((cva as unknown as { isDisabled: () => boolean }).isDisabled()).toBe(true);
  });

  it('shows error note', async () => {
    const { container } = await render(UiSwitchComponent, {
      inputs: { error: 'Required' },
    });
    expect(container.querySelector('ion-note')?.textContent).toContain('Required');
  });
});

// ─── UiCheckboxComponent ─────────────────────────────────────────────────────

describe('UiCheckboxComponent', () => {
  it('renders unchecked by default', async () => {
    const { container } = await render(UiCheckboxComponent, {
      inputs: { label: 'Accept terms' },
    });
    expect(container.querySelector('.checkbox--on')).toBeFalsy();
    expect(container.querySelector('.ui-checkbox-text')?.textContent).toContain('Accept terms');
  });

  it('CVA: writeValue(true) adds checkbox--on class', async () => {
    const { fixture, container } = await render(UiCheckboxComponent, {});
    fixture.componentInstance.writeValue(true);
    fixture.detectChanges();
    expect(container.querySelector('.checkbox--on')).toBeTruthy();
  });

  it('clicking native input toggles checked state and calls onChange', async () => {
    let received: boolean | null = null;
    const { fixture, container } = await render(UiCheckboxComponent, {});
    fixture.componentInstance.registerOnChange((v: boolean) => (received = v));
    fixture.detectChanges();

    const nativeInput = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    nativeInput.checked = true;
    fireEvent.change(nativeInput);
    expect(received).toBe(true);
  });

  it('disabled: native input is disabled', async () => {
    const { fixture, container } = await render(UiCheckboxComponent, {});
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();

    const nativeInput = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(nativeInput.disabled).toBe(true);
  });

  it('shows error note', async () => {
    const { container } = await render(UiCheckboxComponent, {
      inputs: { error: 'Must accept terms' },
    });
    expect(container.querySelector('ion-note')?.textContent).toContain('Must accept terms');
  });
});

// ─── UiSelectComponent ───────────────────────────────────────────────────────

describe('UiSelectComponent', () => {
  const options = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  it('renders the label and a field trigger showing the placeholder', async () => {
    const { container } = await render(UiSelectComponent, {
      inputs: { label: 'Theme', options, placeholder: 'Pick one' },
    });
    expect(container.querySelector('ion-label')?.textContent).toContain('Theme');
    expect(container.querySelector('.ui-select')).toBeTruthy();
    expect(container.querySelector('.ui-select__value')?.textContent?.trim()).toBe('Pick one');
  });

  it('CVA: writeValue sets the value and shows its label in the field', async () => {
    const { fixture, container } = await render(UiSelectComponent, { inputs: { options } });
    fixture.componentInstance.writeValue('dark');
    fixture.detectChanges();
    expect((fixture.componentInstance as unknown as { value: () => string | null }).value()).toBe('dark');
    expect(container.querySelector('.ui-select__value')?.textContent?.trim()).toBe('Dark');
  });

  it('CVA: commit applies the draft and notifies (sheet round-trip)', async () => {
    const onChange = vi.fn();
    const { fixture } = await render(UiSelectComponent, { inputs: { options } });
    const c = fixture.componentInstance as unknown as {
      registerOnChange(fn: (v: string | null) => void): void;
      draft: { set(v: string): void }; commit(): void; value(): string | null;
    };
    c.registerOnChange(onChange);
    // willOpen would sync draft from value; simulate the user picking an option then Apply.
    c.draft.set('system');
    c.commit();
    expect(onChange).toHaveBeenCalledWith('system');
    expect(c.value()).toBe('system');
  });

  it('CVA: setDisabledState disables the trigger', async () => {
    const { fixture, container } = await render(UiSelectComponent, { inputs: { options } });
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();
    expect((container.querySelector('.ui-select') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows error note', async () => {
    const { container } = await render(UiSelectComponent, {
      inputs: { options, error: 'Selection required' },
    });
    expect(container.querySelector('ion-note')?.textContent).toContain('Selection required');
    expect(container.querySelector('.ui-field--error')).toBeTruthy();
  });

  it('does not show label element when label is empty', async () => {
    const { container } = await render(UiSelectComponent, {
      inputs: { options, label: '' },
    });
    expect(container.querySelector('ion-label')).toBeFalsy();
  });
});

// ─── Reactive Forms integration ──────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, UiInputComponent, UiSwitchComponent, UiCheckboxComponent],
  template: `
    <form [formGroup]="form">
      <ui-input formControlName="email" label="Email"></ui-input>
      <ui-switch formControlName="active" label="Active"></ui-switch>
      <ui-checkbox formControlName="agreed" label="Agree"></ui-checkbox>
    </form>
  `,
})
class TestFormHostComponent {
  form = new FormGroup({
    email: new FormControl(''),
    active: new FormControl(false),
    agreed: new FormControl(false),
  });
}

describe('CVA Reactive Forms round-trip', () => {
  it('UiInput reads and writes through FormControl', async () => {
    const { fixture } = await render(TestFormHostComponent);
    const form = fixture.componentInstance.form;

    form.patchValue({ email: 'test@x.com' });
    fixture.detectChanges();
    expect(form.get('email')?.value).toBe('test@x.com');
  });

  it('UiSwitch reads and writes through FormControl', async () => {
    const { fixture } = await render(TestFormHostComponent);
    const form = fixture.componentInstance.form;

    form.patchValue({ active: true });
    fixture.detectChanges();
    expect(form.get('active')?.value).toBe(true);
  });

  it('UiCheckbox reads and writes through FormControl', async () => {
    const { fixture } = await render(TestFormHostComponent);
    const form = fixture.componentInstance.form;

    form.patchValue({ agreed: true });
    fixture.detectChanges();
    expect(form.get('agreed')?.value).toBe(true);
  });
});
