import { Component } from '@angular/core'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { CommonModule } from '@angular/common'

@Component({
  standalone: true,
  selector: 'app-thank-you-page',
  templateUrl: './thank-you-page.html',
  styleUrls: ['./thank-you-page.css'],
  imports: [CommonModule, RouterModule]
})
export class ThankYouPage {
  submittedUrl: string = ''

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Read URL parameter (submitted bookmark)
    this.route.queryParams.subscribe(params => {
      this.submittedUrl = params['url'] || ''
    })

  }
  goBack(): void {
    this.router.navigate(['/'], { state: { fromThankYou: true } });
  }

}
