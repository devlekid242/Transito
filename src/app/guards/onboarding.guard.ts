import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { OnboardingService } from 'src/app/services/onboarding.service';

@Injectable({ providedIn: 'root' })
export class OnboardingGuard implements CanActivate {
  constructor(
    private onboardingService: OnboardingService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    const seen = await this.onboardingService.hasSeenOnboarding();
    if (!seen) {
      this.router.navigate(['/onboarding']);
      return false;
    }
    return true;
  }
}