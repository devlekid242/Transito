import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonTabs,
  IonTabButton,
  IonTabBar,
  IonLabel,
  NavController,
} from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    IonTabs,
    IonTabButton,
    IonTabBar,
    IonLabel,
    CommonModule,
    RouterModule,
    RouterOutlet,
  ],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  private auth = inject(AuthService);
  private navCtrl = inject(NavController);

  // Signal dérivé de l'observable role$ (se désabonne automatiquement)
  public role = toSignal(this.auth.role$, {
    initialValue: this.auth.getRole(),
  });

  // Signal pour l'onglet actif, initialisé selon le rôle courant
  public activeTab = signal<string>(
    this.role() === 'client' ? 'home' : 'partner-dashboard',
  );

  onTabChange(event: any) {
    const currentRole = this.role();
    if (currentRole === 'client') this.activeTab.set(event.tab || 'home');
    if (currentRole === 'partner')
      this.activeTab.set(event.tab || 'partner-dashboard');
  }
}
