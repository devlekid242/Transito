import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  NavController,
  LoadingController,
  AlertController,
} from '@ionic/angular';
import { TripService } from '../../../services/trip.service';
import { Trip } from '../../../models';

@Component({
  selector: 'app-favorite-trips',
  templateUrl: './favorite-trips.page.html',
  styleUrls: ['./favorite-trips.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class FavoriteTripsPage implements OnInit {
  favoriteTrips: Trip[] = [];
  isLoading = false;

  constructor(
    private navCtrl: NavController,
    private tripService: TripService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.loadFavoriteTrips();
  }

  private async loadFavoriteTrips() {
    this.isLoading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Chargement des trajets favoris...',
    });
    await loader.present();

    this.tripService.getFavoriteTrips().subscribe({
      next: (trips) => {
        this.favoriteTrips = trips;
        this.isLoading = false;
        loader.dismiss();
      },
      error: (err) => {
        console.error('Erreur chargement favoris:', err);
        this.isLoading = false;
        loader.dismiss();
        this.showAlert('Erreur', 'Impossible de charger vos trajets favoris');
      },
    });
  }

  bookTrip(trip: Trip) {
    this.navCtrl.navigateForward(`/booking-form/${trip.id}`);
  }

  removeFavorite(trip: Trip) {
    this.showConfirmRemove(trip);
  }

  private async showConfirmRemove(trip: Trip) {
    const alert = await this.alertCtrl.create({
      header: 'Retirer des favoris?',
      message: `Êtes-vous sûr de vouloir retirer ce trajet de vos favoris?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
        },
        {
          text: 'Retirer',
          role: 'destructive',
          handler: () => {
            this.tripService.removeFavoriteTrip(trip.id).subscribe({
              next: () => {
                this.favoriteTrips = this.favoriteTrips.filter(
                  (t) => t.id !== trip.id,
                );
                this.showAlert('Succès', 'Trajet retiré de vos favoris');
              },
              error: (err) => {
                console.error('Erreur:', err);
                this.showAlert('Erreur', 'Impossible de retirer le trajet');
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  navigateToHome() {
    this.navCtrl.navigateRoot('/tabs/home');
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  calculerDuree(heureDepart: string, heureArrivee: string) {
    if (!heureDepart || !heureArrivee) {
      return '-';
    }

    // Conversion des chaînes ISO en objets Date
    const dateDepart = new Date(heureDepart);
    const dateArrivee = new Date(heureArrivee);

    // Calcul de la différence en millisecondes
    const differenceMs = dateArrivee.getTime() - dateDepart.getTime();

    // Gestion d'une erreur de saisie (ex: départ après l'arrivée)
    if (differenceMs < 0) {
      return "L'heure d'arrivée doit être après l'heure de départ !";
    }

    // Conversion des millisecondes en heures et minutes
    const totalMinutes = Math.floor(differenceMs / (1000 * 60));
    const heures = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Formatage du résultat
    return `${heures}h ${minutes}min`;
  }
}
