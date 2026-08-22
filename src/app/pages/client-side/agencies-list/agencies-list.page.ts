import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  InfiniteScrollCustomEvent,
  LoadingController,
  AlertController,
  ViewWillEnter, // 👈 nouveau
  ViewWillLeave, // 👈 nouveau (optionnel, pour le nettoyage)
} from '@ionic/angular';
import { Router } from '@angular/router';
import { AgencyService } from '../../../services/agency.service';
import { Agency } from '../../../models';
import { SharedHeaderComponent } from 'src/app/components/shared-header/shared-header.component';
import { environment } from 'src/environments/environment.prod';

interface AgencyCard {
  id: number;
  name: string;
  rating: number;
  reviewsCount: number;
  logoUrl: string | null;
  verified: boolean;
  destinations: string;
  tags: string[];
}

@Component({
  selector: 'app-agencies-list',
  templateUrl: './agencies-list.page.html',
  styleUrls: ['./agencies-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedHeaderComponent],
})
export class AgenciesListPage implements OnInit, ViewWillEnter, ViewWillLeave {
  searchQuery = '';
  currentPage = 1;
  pageSize = 10;
  hasMore = true;
  isLoading = false;

  readonly baseApiUrl = environment.baseApiUrl;

  allAgencies: AgencyCard[] = [];
  filteredAgencies: AgencyCard[] = [];

  constructor(
    private navCtrl: NavController,
    private route: Router,
    private agencyService: AgencyService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.loadAgencies();
  }

  ionViewWillEnter() {
    this.loadAgencies();
  }

  ionViewWillLeave() {
    this.isLoading = false;
  }

  private async loadAgencies(
    page: number = 1,
    event?: InfiniteScrollCustomEvent,
  ) {
    this.isLoading = true;
    if (page === 1) {
      this.agencyService.getAgencies(page, this.pageSize).subscribe({
        next: (response) => {
          const agencies = this.extractAgencyList(response);
          this.hasMore = agencies.length === this.pageSize;
          this.allAgencies = agencies;
          this.filterAgencies();
        },
        error: async (err) => {
          console.error('Erreur chargement agences :', err);
          await this.showAlert('Erreur', 'Impossible de charger les agences.');
        },
        complete: () => {
          this.isLoading = false;
          if (event) {
            event.target.complete();
            if (!this.hasMore) {
              event.target.disabled = true;
            }
          }
        },
      });
    } else {
      this.agencyService.getAgencies(page, this.pageSize).subscribe({
        next: (response) => {
          const agencies = this.extractAgencyList(response);
          if (agencies.length < this.pageSize) {
            this.hasMore = false;
          }
          this.allAgencies = [...this.allAgencies, ...agencies];
          this.filterAgencies();
        },
        error: (err) => {
          console.error('Erreur chargement supplémentaires :', err);
        },
        complete: () => {
          this.isLoading = false;
          if (event) {
            event.target.complete();
            if (!this.hasMore) {
              event.target.disabled = true;
            }
          }
        },
      });
    }
  }

  private extractAgencyList(response: any): AgencyCard[] {
    const apiAgencies: Agency[] = Array.isArray(response)
      ? response
      : (response?.data ?? response?.['hydra:member'] ?? []);

    return apiAgencies.map((agency) => ({
      id: agency.id,
      name: agency.name,
      rating: agency.rating ?? 0,
      reviewsCount: agency.totalReviews ?? 0,
      logoUrl: agency.logoUrl ?? null,
      verified: agency.isVerified ?? false,
      destinations: [agency.city, agency.address].filter(Boolean).join(', '),
      tags: agency.isVerified ? ['Vérifiée'] : ['Standard'],
    }));
  }

  // Filtrer dynamiquement les agences selon le texte saisi
  filterAgencies() {
    if (!this.searchQuery.trim()) {
      this.filteredAgencies = [...this.allAgencies];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredAgencies = this.allAgencies.filter(
      (agency) =>
        agency.name.toLowerCase().includes(query) ||
        agency.destinations.toLowerCase().includes(query) ||
        agency.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  // Gestion du chargement infini
  onIonInfinite(event: Event) {
    if (!this.hasMore) {
      const target = (event as any).target;
      target.complete();
      target.disabled = true;
      return;
    }

    this.currentPage++;
    this.loadAgencies(this.currentPage, event as InfiniteScrollCustomEvent);
  }

  // Visualiser le profil détaillé d'une agence
  viewProfile(agency: AgencyCard) {
    this.route.navigate([`/agency-profil/${agency.id}`]);
  }

  // Aiguillage pour la barre de navigation
  navigateTo(destination: string) {
    if (destination === 'home') {
      this.navCtrl.navigateRoot('/tabs/home');
    } else if (destination === 'bookings') {
      this.navCtrl.navigateRoot('/tabs/reservation');
    } else {
      console.log('Navigation demandée vers :', destination);
    }
  }

  // Ouvrir la page de notifications
  openNotifications() {
    this.navCtrl.navigateForward('/notifications');
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}
