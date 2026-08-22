import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, of, forkJoin } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
import { unwrapCollection } from '../shared/rxjs-operators';

// export interface Trip {
//   id: number;
//   departurePoint: string;
//   arrivalPoint: string;
//   departureTime: string;
//   arrivalTime: string;
//   availableSeats: number;
//   price: number;
//   busId: number;
//   status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
//   createdBy: number;
// }

export interface Trip {
  id: number;
  departureCity: string;
  arrivalCity: string;
  boardingPoints: Array<{
    id: number;
    name: string;
    address?: string;
    city?: string;
  }>;
  deboardingPoints: Array<{
    id: number;
    name: string;
    address?: string;
    city?: string;
  }>;
  departurePoint?: any;
  arrivalPoint?: any;
  departureTime: string;
  estimatedArrivalTime?: string;
  tripDate?: string;
  departureTimeOfDay?: string;
  arrivalTimeOfDay?: string;
  price: string | number;
  driverName?: string;
  driverLicense?: string;
  driverPhone?: string;
  driverExperience?: string;
  driverPhotoUrl?: string;

  hostessName?: string;
  hostessPhone?: string;
  hostessPhotoUrl?: string;
  passengers?: Passenger[];

  bus?: any;
  seatsReserved: number;
  status: 'planifie' | 'embarquement' | 'en_route' | 'termine' | 'annule';
  createdAt: string;
  time?: string;
  date?: string;
  route?: string;
  notes?: string;
}

export interface Passenger {
  id: number;
  seatNumber: string;
  name: string;
  phone: string;
  ticketCode: string;
  status: 'Embarqué' | 'Payé' | 'Annulé';
}

export interface TicketValidationResponse {
  success: boolean;
  ticketNumber: string;
  passengerName: string;
  passengerPhone?: string;
  boardingStatus: 'VALID' | 'ALREADY_BOARDED' | 'NOT_FOUND' | 'CANCELLED';
  message: string;
  boardingTime?: string;
  // Champs enrichis renvoyés par TicketController::mapTicket() côté serveur.
  origin?: string;
  destination?: string;
  agencyName?: string;
  tripNumber?: string;
  departureDate?: string;
  departureTime?: string;
  seatNumber?: string;
  busLicensePlate?: string;
  validatedByAgentName?: string;
}

export interface ManifestData {
  tripId: number;
  busInfo: {
    id: number;
    licensePlate: string;
    capacity: number;
    model: string;
  };
  passengers: Array<{
    id: number;
    name: string;
    seatNumber: number;
    ticketNumber: string;
    boardingStatus: 'PENDING' | 'BOARDED' | 'NO_SHOW';
    phoneNumber: string;
    boardingPoint?: string;
    deboardingPoint?: string;
    price?: number;
  }>;
  departure: string;
  arrival: string;
  departureTime: string;
  route: Array<{
    departure: string;
    arrival: string;
    departurePoint: string;
    arrivalPoint: string;
    departureDateTime: string;
    arrivalDateTime: string;
  }>;
}

export interface PartnerProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  agency: {
    id: number;
    name: string;
    licenseNumber: string;
    operatingLicenseExpiry: string;
    addressCity: string;
    addressCountry: string;
  };
  role: string;
  createdAt: string;
}

export interface Bus {
  id: number;
  licensePlate: string;
  model: string;
  type: string;
  capacity: number;
  manufacturer: string;
  registrationDate: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
}

export interface BusPoint {
  id: number;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
  services: any;
}

export interface Notification {
  id: number;
  type: 'BOOKING' | 'TICKET' | 'PAYMENT' | 'ALERT' | 'INFO';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PartnerApiService {
  private apiUrl = environment.apiUrl;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadNotifications();
  }

  // ============= TRIPS =============

  /**
   * Récupère tous les trajets du partenaire
   */
  getTrips(
    date?: any,
    status?: 'active' | 'scheduled' | 'completed',
  ): Observable<Trip[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status.toUpperCase());
    }
    if (date) {
      params = params.set('departure_date', date);
    }
    // console.log(date);
    return this.http
      .get<any>(`${this.apiUrl}/trips`, { params })
      .pipe(unwrapCollection<Trip>());
  }

  /**
   * Récupère les détails d'un trajet spécifique
   */
  getTripDetails(tripId: number): Observable<Trip> {
    return this.http.get<Trip>(`${this.apiUrl}/trips/${tripId}`);
  }

  /**
   * Crée un nouveau trajet
   */
  createTrip(tripData: Partial<Trip>): Observable<Trip> {
    return this.http.post<Trip>(`${this.apiUrl}/trips`, tripData);
  }

  /**
   * Met à jour un trajet existant
   */
  updateTrip(tripId: number, updates: Partial<Trip>): Observable<Trip> {
    return this.http.put<Trip>(`${this.apiUrl}/trips/${tripId}`, updates);
  }

  /**
   * Annule un trajet
   */
  cancelTrip(
    tripId: number,
    reason: string,
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/trips/${tripId}/cancel`,
      { reason },
    );
  }

  // ============= TICKETS =============

  /**
   * Valide un ticket via QR code
   */
  validateTicket(
    qrCode: string,
    TicketCode?: string,
  ): Observable<TicketValidationResponse> {
    return this.http.patch<TicketValidationResponse>(
      `${this.apiUrl}/tickets/validate`,
      { qrCodeToken: qrCode, ticketCode: TicketCode },
    );
  }

  /**
   * Récupère les statistiques de validation pour un trajet
   */
  getValidationStats(tripId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/trips/${tripId}/validation-stats`);
  }

  // ============= MANIFESTS =============

  /**
   * Récupère le manifeste d'embarquement d'un trajet
   */

  /**
   * Génère un PDF du manifeste
   */
  generateManifestPDF(tripId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/trips/${tripId}/manifest/pdf`, {
      responseType: 'blob',
    });
  }

  // ============= PROFILE =============

  /**
   * Récupère le profil du partenaire
   */
  getPartnerProfile(): Observable<PartnerProfile> {
    return this.http.get<PartnerProfile>(`${this.apiUrl}/users/me`);
  }

  /**
   * Met à jour le profil du partenaire
   */
  updatePartnerProfile(
    updates: Partial<PartnerProfile>,
  ): Observable<PartnerProfile> {
    return this.http.patch<PartnerProfile>(`${this.apiUrl}/users/me`, updates);
  }

  /**
   * Met à jour la photo de profil
   */
  updateProfilePhoto(file: File): Observable<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/users/me/photo`, formData);
  }

  // ============= BUSES =============

  /**
   * Récupère la liste des bus du partenaire
   */
  getBuses(): Observable<Bus[]> {
    return this.http
      .get<any>(`${this.apiUrl}/buses/agency`)
      .pipe(unwrapCollection<Bus>());
  }

  /**
   * Récupère les détails d'un bus
   */
  getBusDetails(busId: number): Observable<Bus> {
    return this.http.get<Bus>(`${this.apiUrl}/buses/${busId}`);
  }

  /**
   * Ajoute un nouveau bus
   */
  addBus(busData: Partial<Bus>): Observable<Bus> {
    return this.http.post<Bus>(`${this.apiUrl}/buses/add`, busData);
  }

  /**
   * Met à jour les informations d'un bus
   */
  updateBus(busId: number, updates: Partial<Bus>): Observable<Bus> {
    return this.http.put<Bus>(`${this.apiUrl}/buses/${busId}`, updates);
  }

  /**
   * Supprime un bus
   */
  deleteBus(busId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/buses/${busId}`,
    );
  }

  // ============= BUS POINTS =============

  /**
   * Récupère la liste des points de bus (arrêts)
   */
  getBusPoints(): Observable<BusPoint[]> {
    return this.http
      .get<any>(`${this.apiUrl}/agency-points`)
      .pipe(unwrapCollection<BusPoint>());
  }

  /**
   * Ajoute un nouveau point de bus
   */
  addBusPoint(pointData: Partial<BusPoint>): Observable<BusPoint> {
    return this.http.post<BusPoint>(`${this.apiUrl}/agency-points`, pointData);
  }

  /**
   * Met à jour un point de bus
   */
  updateBusPoint(
    pointId: number,
    updates: Partial<BusPoint>,
  ): Observable<BusPoint> {
    return this.http.patch<BusPoint>(
      `${this.apiUrl}/agency-points/${pointId}`,
      updates,
    );
  }

  /**
   * Supprime un point de bus
   */
  deleteBusPoint(
    pointId: number,
  ): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/agency-points/${pointId}`,
    );
  }

  // ============= NOTIFICATIONS =============

  /**
   * Charge les notifications du partenaire
   */
  private loadNotifications(): void {
    this.http
      .get<any>(`${this.apiUrl}/user-notifications`)
      .pipe(
        unwrapCollection<Notification>(),
        catchError((error) => {
          console.error('Erreur lors du chargement des notifications:', error);
          return of([]); // Retourner un tableau vide en cas d'erreur
        }),
      )
      .subscribe((notifications) => {
        this.notificationsSubject.next(notifications);
      });
  }

  /**
   * Récupère les notifications du partenaire
   */
  getNotifications(): Observable<Notification[]> {
    return this.http
      .get<any>(`${this.apiUrl}/user-notifications`)
      .pipe(unwrapCollection<Notification>());
  }

  /**
   * Marque une notification comme lue
   */
  markNotificationAsRead(
    notificationId: number,
  ): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/user-notifications/${notificationId}/read`,
      {},
    );
  }

  /**
   * Marque toutes les notifications comme lues
   */
  markAllNotificationsAsRead(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/user-notifications/mark-all-read`,
      {},
    );
  }

  /**
   * Supprime une notification
   */
  deleteNotification(notificationId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/notifications/${notificationId}`,
    );
  }

  // ============= STATISTICS & REPORTS =============

  /**
   * Récupère les statistiques du partenaire
   */
  getPartnerStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }

  /**
   * Récupère les statistiques pour l'agent connecté (tickets validés, etc.)
   * Accepte une plage de dates au format ISO (start, end)
   */
  getAgentStats(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);
    return this.http.get(`${this.apiUrl}/statistics/agent`, { params });
  }

  /**
   * Récupère les statistiques comparatives (jour vs semaine vs mois, etc.)
   */
  getAgentStatsComparison(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
  ): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get(`${this.apiUrl}/statistics/agent/comparison`, {
      params,
    });
  }

  /**
   * Récupère les statistiques détaillées des trajets pour l'agent
   */
  getAgentTripsStats(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);
    return this.http.get(`${this.apiUrl}/statistics/agent/trips`, { params });
  }

  /**
   * Récupère les statistiques de l'agence (admin uniquement)
   */
  getAgencyStats(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);
    return this.http.get(`${this.apiUrl}/statistics/agency`, { params });
  }

  /**
   * Récupère les revenus du partenaire pour une période
   */
  getRevenue(startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams().set('start', startDate).set('end', endDate);
    return this.http.get(`${this.apiUrl}/revenue`, { params });
  }

  /**
   * Génère un rapport de trajet
   */
  generateTripReport(tripId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/trips/${tripId}/report`, {
      responseType: 'blob',
    });
  }

  // ============= HELPER METHODS =============

  /**
   * Récupère le nombre de notifications non lues
   */
  getUnreadNotificationCount(): Observable<number> {
    return this.http.get<number>(
      `${this.apiUrl}/user-notifications/unread/count`,
    );
  }

  /**
   * Récupère les trajets du jour
   */
  getTodaysTrips(): Observable<Trip[]> {
    const today = new Date().toISOString().slice(0, 10);
    return this.http
      .get<any>(`${this.apiUrl}/trips`, {
        params: new HttpParams().set('trip_date', today),
      })
      .pipe(unwrapCollection<Trip>());
  }

  /**
   * Recherche des trajets par paramètres
   */
  searchTrips(
    departure: string,
    arrival: string,
    date: string,
  ): Observable<Trip[]> {
    const params = new HttpParams()
      .set('departure', departure)
      .set('arrival', arrival)
      .set('date', date);
    return this.http
      .get<any>(`${this.apiUrl}/trips/search`, { params })
      .pipe(unwrapCollection<Trip>());
  }

  /**
   * Récupère la liste des villes disponibles
   */
  getCities(): Observable<string[]> {
    return this.http
      .get<any>(`${this.apiUrl}/cities`)
      .pipe(unwrapCollection<string>());
  }

  /**
   * Récupère les réservations récentes
   */
  getRecentBookings(): Observable<any[]> {
    return this.http
      .get<any>(`${this.apiUrl}/statistics/agent/recent-bookings`)
      .pipe(unwrapCollection<any>());
  }

  /**
   * Récupère le manifeste d'un trajet
   */
  getTripManifest(tripId: number): Observable<ManifestData> {
    return forkJoin({
      trip: this.getTripDetails(tripId),
      tickets: this.http
        .get<any[]>(`${this.apiUrl}/tickets/list`, {
          params: new HttpParams().set('trip_id', String(tripId)),
        })
        .pipe(unwrapCollection<any>()),
    }).pipe(
      map(({ trip, tickets }) => {
        const processedPassengers = tickets.map((t: any) => {
          const statusCode = String(
            t.statusCode || t.status || '',
          ).toLowerCase();
          let boardingStatus: 'BOARDED' | 'PENDING' | 'NO_SHOW' | 'CANCELLED' =
            'PENDING';

          if (
            statusCode === 'embarque' ||
            statusCode === 'boarded' ||
            statusCode === 'utilisé' ||
            statusCode === 'used'
          ) {
            boardingStatus = 'BOARDED';
          } else if (statusCode === 'annule' || statusCode === 'cancelled') {
            boardingStatus = 'CANCELLED';
          } else if (
            statusCode === 'absent' ||
            statusCode === 'no_show' ||
            statusCode === 'no-show'
          ) {
            boardingStatus = 'NO_SHOW';
          }

          return {
            id: t.id,
            name: t.passengerName || t.name || 'Invité',
            seatNumber: Number(t.seatNumber) || 0,
            ticketNumber: t.ticketNumber || `TKT-${t.id}`,
            boardingStatus,
            phoneNumber: t.passengerPhone || t.phoneNumber || '',
            boardingPoint:
              t.boardingPoint || t.boardingLocation || trip.departureCity,
            deboardingPoint:
              t.deboardingPoint || t.destinationCity || trip.arrivalCity,
            price: Number(t.price) || undefined,
          };
        });

        const total = processedPassengers.length;
        const boarded = processedPassengers.filter(
          (p) => p.boardingStatus === 'BOARDED',
        ).length;
        const pending = processedPassengers.filter(
          (p) => p.boardingStatus === 'PENDING',
        ).length;
        const noShow = processedPassengers.filter(
          (p) => p.boardingStatus === 'NO_SHOW',
        ).length;
        const cancelled = processedPassengers.filter(
          (p) => p.boardingStatus === 'CANCELLED',
        ).length;

        return {
          tripId,
          departure: trip.departureCity ?? '',
          arrival: trip.arrivalCity ?? '',
          departureTime: trip.departureTime ?? '',
          arrivalTime: trip.estimatedArrivalTime ?? '',
          route: {
            departure: trip.departureCity ?? '',
            arrival: trip.arrivalCity ?? '',
            departurePoint: trip.departurePoint?.name ?? '',
            arrivalPoint: trip.arrivalPoint?.name ?? '',
            departureDateTime: trip.departureTime ?? '',
            arrivalDateTime: trip.estimatedArrivalTime ?? '',
          },
          status: trip.status,
          notes: trip.notes ?? '',
          busInfo: {
            id: trip.bus?.id ?? 0,
            licensePlate: trip.bus?.registrationNumber ?? '',
            capacity: trip.bus?.capacity ?? 0,
            model: `${trip.bus?.brand ?? ''} ${trip.bus?.model ?? ''}`.trim(),
            image: trip.bus?.photoUrl || trip.bus?.imageUrl || '',
            photoUrl: trip.bus?.photoUrl || trip.bus?.imageUrl || '',
          },
          driver: {
            name: trip.driverName ?? '',
            license: trip.driverLicense ?? '',
            phone: trip.driverPhone ?? '',
            experience: trip.driverExperience ?? '',
            photo: trip.driverPhotoUrl ?? '',
          },
          hostess: {
            name: trip.hostessName ?? '',
            phone: trip.hostessPhone ?? '',
            photo: trip.hostessPhotoUrl ?? '',
          },
          passengers: processedPassengers,
          stops:
            trip.boardingPoints?.map((point: any, index: number) => ({
              location: point.name || `Étape ${index + 1}`,
              time: point.time ?? '',
              status: 'Programmé',
              completed: false,
              current: index === 0,
            })) ?? [],
          stats: {
            total,
            boarded,
            pending,
            noShow,
            cancelled,
            occupancyRate: total ? Math.round((boarded / total) * 100) : 0,
          },
        } as any;
      }),
    );
  }
}
