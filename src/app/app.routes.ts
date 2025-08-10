import { Routes } from '@angular/router';
import { OverviewPage } from './overview-page';

/* -------------------------------------------------------------------------
   Application Route Configuration

   Purpose:
   - Defines the set of routes (URL paths) and the components they render.
   - Used by Angular's Router to match browser URLs to the correct view.

   Notes:
   - This uses Angular's standalone routing style — no NgModule required.
   - The `Routes` type ensures our route definitions are valid at compile time.
------------------------------------------------------------------------- */
export const routes: Routes = [
  /* -----------------------------------------------------------------------
     Root Path (`''`):
     - Matches the base URL (e.g., `/`).
     - Renders the `OverviewPage` component, which is the main bookmark
       management interface (add/edit/delete/pagination).
  ----------------------------------------------------------------------- */
  { path: '', component: OverviewPage },

  /* -----------------------------------------------------------------------
     "Thank You" Path (`/thank-you`):
     - Lazy-loads the `ThankYouPage` component when navigated to.
     - `loadComponent` returns a Promise that dynamically imports the
       component's module only when needed, reducing initial bundle size.
     - `.then(m => m.ThankYouPage)` picks the specific exported component
       from the module after import resolution.
  ----------------------------------------------------------------------- */
  { path: 'thank-you', loadComponent: () => import('./thank-you-page').then(m => m.ThankYouPage) }
];
