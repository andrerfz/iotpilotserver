import { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Walk to the deepest activated route and return its `data.breadcrumb` array
 * (the prototype's CRUMBS map, e.g. ['Operate', 'Dashboard']). Returns [] if
 * no route in the chain declares one.
 */
export function breadcrumbFromSnapshot(root: ActivatedRouteSnapshot | null): string[] {
  let node = root;
  let crumb: string[] = [];
  while (node) {
    const b = node.data?.['breadcrumb'];
    if (Array.isArray(b)) {
      crumb = b as string[];
    }
    node = node.firstChild;
  }
  return crumb;
}
