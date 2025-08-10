import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

/* -------------------------------------------------------------------------
   Application Configuration (`appConfig`)

   Purpose:
   - Defines the top-level configuration for the Angular application.
   - Passed to `bootstrapApplication()` in `main.ts` to wire up global
     services, routing, and runtime behavior.
------------------------------------------------------------------------- */
export const appConfig: ApplicationConfig = {
  providers: [
    /* ---------------------------------------------------------------------
       Browser Global Error Listeners
       - `provideBrowserGlobalErrorListeners()` installs global event
         listeners for uncaught errors and unhandled promise rejections.
       - Ensures Angular’s error handling hooks catch these issues so they
         can be logged or surfaced in a consistent way.
    --------------------------------------------------------------------- */
    provideBrowserGlobalErrorListeners(),

    /* ---------------------------------------------------------------------
       Zone.js Change Detection Optimization
       - `provideZoneChangeDetection()` configures how Angular's change
         detection runs in response to browser events.
       - `eventCoalescing: true` batches multiple DOM events into a single
         change detection cycle, reducing unnecessary re-renders and
         improving performance, especially in high-frequency event scenarios.
    --------------------------------------------------------------------- */
    provideZoneChangeDetection({ eventCoalescing: true }),

    /* ---------------------------------------------------------------------
       Router Configuration
       - `provideRouter(routes)` registers the application’s route definitions
         (from `app.routes.ts`) with Angular’s Router.
       - This enables navigation between `OverviewPage`, `ThankYouPage`, etc.
    --------------------------------------------------------------------- */
    provideRouter(routes)
  ]
};
