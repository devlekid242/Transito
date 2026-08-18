import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Trip, TripSearchParams, TripResponse, TripDetail } from '../models';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TripService {
  private apiUrl = `${environment.apiUrl}/trips`;
  private agencyTripsUrl = `${environment.apiUrl}/agencies`;

  constructor(private http: HttpClient) {}

  /**
   * Rechercher les trajets selon les critères avec pagination
   */
  searchTrips(
    params: TripSearchParams,
    page: number = 1,
    limit: number = 10,
  ): Observable<TripResponse> {
    let httpParams = new HttpParams()
      .set('departure_city', params.departureCity)
      .set('arrival_city', params.arrivalCity)
      .set('departure_date', params.departureDate)
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (params.category) {
      httpParams = httpParams.set('category', params.category);
    }
    if (params.maxPrice) {
      httpParams = httpParams.set('max_price', params.maxPrice.toString());
    }

    return this.http
      .get<any>(this.apiUrl, { params: httpParams })
      .pipe(unwrapCollection<Trip, TripResponse>(false));
  }

  /**
   * Obtenir tout les trajete disponible a venir
   */

  getUncomingTrips(): Observable<Trip[]> {
    return this.http
      .get<any>(`${this.apiUrl}/uncoming`)
      .pipe(unwrapCollection<Trip>());
  }

  /**
   * Obtenir les détails d'un trajet
   */
  getTripDetail(tripId: number): Observable<Trip> {
    return this.http.get<Trip>(`${this.apiUrl}/${tripId}`);
  }

  getTripDetails(tripId: number | string): Observable<TripDetail> {
    return this.http.get<TripDetail>(`${this.apiUrl}/${tripId}`);
  }
  /**
   * Obtenir les villes de départ
   */
  getDepartureCities(): Observable<any[]> {
    return this.http
      .get<any>(`${this.apiUrl}/cities/departure`)
      .pipe(unwrapCollection<any>());
  }

  /**
   * Obtenir les villes d'arrivée
   */
  getArrivalCities(): Observable<any[]> {
    return this.http
      .get<any>(`${this.apiUrl}/cities/arrival`)
      .pipe(unwrapCollection<any>());
  }

  /**
   * Obtenir les trajets populaires
   */
  getPopularTrips(): Observable<Trip[]> {
    return this.http
      .get<any>(`${this.apiUrl}/popular`)
      .pipe(unwrapCollection<Trip>());
  }

  /**
   * Obtenir les trajets par agence
   */
  getTripsByAgency(agencyId: number): Observable<Trip[]> {
    return this.http
      .get<any>(`${this.agencyTripsUrl}/${agencyId}/trips`)
      .pipe(unwrapCollection<Trip>());
  }

  /**
   * Obtenir les trajets favoris de l'utilisateur
   */
  getFavoriteTrips(): Observable<Trip[]> {
    return this.http
      .get<any>(`${this.apiUrl}/favorites`)
      .pipe(unwrapCollection<Trip>());
  }

  /**
   * Ajouter un trajet aux favoris
   */
  addFavoriteTrip(tripId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${tripId}/favorite`, {});
  }

  /**
   * Retirer un trajet des favoris
   */
  removeFavoriteTrip(tripId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${tripId}/favorite`);
  }
}
