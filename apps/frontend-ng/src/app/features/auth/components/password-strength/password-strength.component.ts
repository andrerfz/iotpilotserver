import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';

addIcons({ checkmarkCircleOutline, closeCircleOutline });

interface Rule {
  label: string;
  valid: boolean;
}

@Component({
  selector: 'app-password-strength',
  templateUrl: 'password-strength.component.html',
  styleUrls: ['password-strength.component.scss'],
  imports: [IonIcon],
})
export class PasswordStrengthComponent {
  readonly password = input<string>('');

  readonly rules = computed<Rule[]>(() => {
    const pwd = this.password();
    return [
      { label: 'At least 12 characters', valid: pwd.length >= 12 },
      { label: 'One uppercase letter', valid: /[A-Z]/.test(pwd) },
      { label: 'One lowercase letter', valid: /[a-z]/.test(pwd) },
      { label: 'One number', valid: /\d/.test(pwd) },
      {
        label: 'One special character',
        valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
      },
    ];
  });
}
