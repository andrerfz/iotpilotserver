import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { provideRouter } from '@angular/router';
import { AuthService } from '@ng/core/auth/auth.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { OrgHubPage } from './org-hub.page';
import { SETTINGS_ROUTES } from '../../settings.routes';

async function setup() {
  return render(OrgHubPage, {
    providers: [
      provideRouter([
        {
          path: 'settings/org',
          component: OrgHubPage,
          children: SETTINGS_ROUTES.find((r) => r.path === 'org')?.children ?? [],
        },
      ]),
      { provide: AuthService, useValue: { role: () => 'ADMIN' } },
      { provide: TenantContextService, useValue: { isActive: () => true } },
    ],
  });
}

describe('OrgHubPage', () => {
  it('renders the nav-select trigger showing the active tab', async () => {
    const { getByText } = await setup();
    expect(getByText('Organization')).toBeTruthy();
  });

  it('navItems contains the 5 expected values in order', async () => {
    const { fixture } = await setup();
    const values = fixture.componentInstance.navItems.map((i) => i.value);
    expect(values).toEqual(['organization', 'members', 'thresholds', 'api-keys', 'app-config']);
  });
});
