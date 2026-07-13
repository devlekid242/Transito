import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  template: ``,
})
export class TabsRedirectComponent implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const role = this.auth.getRole() || this.auth.getUser()?.role || 'client';
    if (role === 'partner') {
      this.router.navigate(['/tabs/partner-dashboard']);
    } else {
      this.router.navigate(['/tabs/home']);
    }
  }
}
