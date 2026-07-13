import { Component,CUSTOM_ELEMENTS_SCHEMA,EnvironmentInjector,inject,OnDestroy, OnInit} from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonicModule, CommonModule, RouterModule, RouterOutlet],
})
export class TabsPage implements OnDestroy {
  public environmentInjector = inject(EnvironmentInjector);
  public activeTab: string = '';
  public role: string | null = null;
  private sub?: Subscription;

  // constructor() {}
  constructor(private auth: AuthService, private navCtrl: NavController) {
    this.role = this.auth.getRole();
    this.sub = this.auth.role$.subscribe((r) => (this.role = r));
    this.activeTab = this.role === 'client' ? 'home' : 'partner-dashboard';
  }

  

  onTabChange(event: any) {
    if(this.role == "client") this.activeTab = event.tab || 'home';
    if(this.role == "partner") this.activeTab = event.tab || 'partner-dashboard';
    // console.log(event.tab);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
