import { Routes } from '@angular/router'
import { OverviewPage } from './overview-page'

export const routes: Routes = [
  { path: '', component: OverviewPage },
  { path: 'thank-you', loadComponent: () => import('./thank-you-page').then(m => m.ThankYouPage) }
]
