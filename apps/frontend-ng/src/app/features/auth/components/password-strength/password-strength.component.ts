import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
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
  imports: [IonIcon, TranslatePipe],
})
export class PasswordStrengthComponent {
  readonly password = input<string>('');

  readonly rules = computed<Rule[]>(() => {
    const pwd = this.password();
    return [
      { label: 'settings.security.rule_length', valid: pwd.length >= 12 },
      { label: 'settings.security.rule_uppercase', valid: /[A-Z]/.test(pwd) },
      { label: 'settings.security.rule_lowercase', valid: /[a-z]/.test(pwd) },
      { label: 'settings.security.rule_number', valid: /\d/.test(pwd) },
      {
        label: 'settings.security.rule_special',
        valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
      },
    ];
  });
}
