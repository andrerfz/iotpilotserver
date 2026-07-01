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
  it('renders account tab items', async () => {
    const { getByText } = await setup();
    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Security')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Preferences')).toBeTruthy();
  });

  it('items contains the 4 expected paths in order', async () => {
    const { fixture } = await setup();
    const paths = fixture.componentInstance.items.map((i) => i.path);
    expect(paths).toEqual(['profile', 'security', 'notifications', 'preferences']);
  });
});
