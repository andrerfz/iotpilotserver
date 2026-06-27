import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, AppLogoComponent } from '@ng/shared/ui';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  gridOutline, hardwareChipOutline, notificationsOutline,
  documentTextOutline, peopleOutline,
  statsChartOutline, serverOutline,
} from 'ionicons/icons';
import { NAV } from './nav';
import { AuthService } from '../core/auth/auth.service';
import { hasRole } from '../core/auth/roles';
import { TenantContextService } from '../core/auth/tenant-context.service';

addIcons({
  gridOutline, hardwareChipOutline, notificationsOutline,
  documentTextOutline, peopleOutline,
  statsChartOutline, serverOutline,
});

/**
 * Left rail — brand mark, grouped nav (Operate / Administer) with active state
 * via routerLinkActive and count badges, plus a tenant footer slot ([tenant],
 * filled by T10). Ported from the prototype `.rail`.
 */
@Component({
  selector: 'app-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IonIcon, AppLogoComponent, TranslatePipe],
  template: `
    <div class="rail">
      <div class="rail__brand">
        <ui-app-logo></ui-app-logo>
      </div>

      <div class="rail__scroll">
        @for (g of visibleNav(); track g.group) {
          <div class="nav-group">
            <div class="nav-group__label">{{ g.group | translate }}</div>
            @for (it of g.items; track it.path) {
              <a class="nav-item" [routerLink]="it.path" routerLinkActive="nav-item--active"
                 [routerLinkActiveOptions]="{ exact: it.exact ?? false }">
                <ion-icon [name]="it.icon"></ion-icon>
                <span>{{ it.label | translate }}</span>
                @if (it.badge) {
                  <span class="nav-item__badge">{{ it.badge }}</span>
                }
              </a>
              @if (it.children?.length) {
                <div class="nav-sub">
                  @for (sub of it.children; track sub.path) {
                    <a class="nav-sub__item" [routerLink]="sub.path" routerLinkActive="nav-sub__item--active">
                      <ion-icon [name]="sub.icon"></ion-icon>
                      <span>{{ sub.label | translate }}</span>
                      @if (sub.badge) {
                        <span class="nav-item__badge">{{ sub.badge }}</span>
                      }
                    </a>
                  }
                </div>
              }
            }
          </div>
        }
      </div>

      <div class="rail__foot" [class.rail__foot--plain]="!isSuperAdmin()">
        <ng-content select="[tenant]"></ng-content>
      </div>
    </div>
  `,
  styleUrl: './rail.component.scss',
})
export class RailComponent {
  private readonly auth = inject(AuthService);
  private readonly tenantCtx = inject(TenantContextService);

  protected readonly isSuperAdmin = computed(() => hasRole(this.auth.role(), 'SUPERADMIN'));

  protected readonly visibleNav = computed(() => {
    const isAdmin = hasRole(this.auth.role(), 'ADMIN');
    const isSuperAdmin = hasRole(this.auth.role(), 'SUPERADMIN');
    // A SUPERADMIN in Platform mode (not acting as a customer) has no tenant, so
    // tenant-scoped views (Operate) are hidden until they pick a customer.
    const hideTenantScoped = isSuperAdmin && !this.tenantCtx.isActive();
    const allowed = (it: { adminOnly?: boolean; superAdminOnly?: boolean; tenantScoped?: boolean }) =>
      (!it.adminOnly || isAdmin)
      && (!it.superAdminOnly || isSuperAdmin)
      && (!it.tenantScoped || !hideTenantScoped);
    return NAV.map(g => ({
      ...g,
      items: g.items
        .filter(allowed)
        .map(it => ({
          ...it,
          children: it.children?.filter(allowed),
        })),
    })).filter(g => g.items.length > 0);
  });
}
