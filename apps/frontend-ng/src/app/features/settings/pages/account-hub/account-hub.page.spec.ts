import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { provideRouter } from '@angular/router';
import { AccountHubPage } from './account-hub.page';
import { SETTINGS_ROUTES } from '../../settings.routes';

async function setup() {
  return render(AccountHubPage, {
    providers: [
      provideRouter([
        {
          path: 'settings/account',
          component: AccountHubPage,
          children: SETTINGS_ROUTES.find((r) => r.path === 'account')?.children ?? [],
        },
      ]),
    ],
  });
}

describe('AccountHubPage', () => {
  it('renders the nav-select trigger showing the active tab', async () => {
    const { getByText } = await setup();
    expect(getByText('Profile')).toBeTruthy();
  });

  it('navItems contains the 4 expected values in order', async () => {
    const { fixture } = await setup();
    const values = fixture.componentInstance.navItems.map((i) => i.value);
    expect(values).toEqual(['profile', 'security', 'notifications', 'preferences']);
  });
});
