import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/* -------------------------------------------------------------------------
   Root Application Component (`App`)

   Purpose:
   - Serves as the top-level component of the Angular application.
   - Acts as the host for the router, rendering the active route's
     component inside its template.

   Decorator Configuration:
   - `selector`   : The custom HTML tag (`<app-root>`) used to embed this
                    component in `index.html`.
   - `imports`    : Declares Angular standalone imports for this component.
                    Here, we import `RouterOutlet` so that child route
                    components can be dynamically rendered.
   - `templateUrl`: Points to the external HTML file containing the layout
                    for this root component.
   - `styleUrl`   : Points to the CSS file providing styles for the root
                    component’s template.

   Notes:
   - This is a **standalone component** (no NgModule needed).
   - All other app components will ultimately be rendered inside the
     `<router-outlet>` declared in this template.
------------------------------------------------------------------------- */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  /* -----------------------------------------------------------------------
     Application Title Signal

     Purpose:
     - `signal()` is part of Angular's reactivity model.
     - Creates a reactive value (`title`) that can be read in templates
       or updated over time, automatically triggering change detection
       when its value changes.

     Here:
     - `title` holds the app name ("phq-bookmark-app").
     - Declared as `protected` so it’s accessible to the template but
       not modifiable outside of this class.
  ----------------------------------------------------------------------- */
  protected readonly title = signal('phq-bookmark-app');
}
