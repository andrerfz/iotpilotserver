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
  it('renders org tab items', async () => {
    const { getByText } = await setup();
    expect(getByText('Organization')).toBeTruthy();
    expect(getByText('Members')).toBeTruthy();
    expect(getByText('Default thresholds')).toBeTruthy();
    expect(getByText('API Keys')).toBeTruthy();
    expect(getByText('App Config')).toBeTruthy();
  });

  it('items contains the 5 expected paths in order', async () => {
    const { fixture } = await setup();
    const paths = fixture.componentInstance.items.map((i) => i.path);
    expect(paths).toEqual(['organization', 'members', 'thresholds', 'api-keys', 'app-config']);
  });
});
