import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const FIRST_LAUNCH_KEY = 'has_seen_onboarding';

@Injectable({ providedIn: 'root' })
export class OnboardingService {

  async hasSeenOnboarding(): Promise<boolean> {
    const { value } = await Preferences.get({ key: FIRST_LAUNCH_KEY });
    return value === 'true';
  }

  async markOnboardingAsSeen(): Promise<void> {
    await Preferences.set({ key: FIRST_LAUNCH_KEY, value: 'true' });
  }
}