import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';

// Trivial component test proving the toolchain end to end:
// Vitest + @analogjs/vite-plugin-angular + Testing Library Angular + jsdom.
// Ionic-specific rendering is exercised in fe-foundation T4.
@Component({
  selector: 'app-smoke',
  template: '<h1>{{ title }}</h1>',
})
class SmokeComponent {
  title = 'frontend-ng toolchain';
}

describe('Vitest + Angular toolchain', () => {
  it('renders a trivial standalone component', async () => {
    await render(SmokeComponent);
    expect(screen.getByText('frontend-ng toolchain')).toBeTruthy();
  });
});
