import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Agency, AgencyResponse, AgencyPoint } from '../models';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class AgencyService {
  private apiUrl = `${environment.apiUrl}/agencies`;

  constructor(private http: HttpClient) {}

  /**
   * Obtenir toutes les agences avec pagination
   */
  getAgencies(
    page: number = 1,
    pageSize: number = 10,
  ): Observable<AgencyResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    return this.http
      .get<any>(this.apiUrl, { params })
      .pipe(unwrapCollection<Agency, AgencyResponse>(false));
  }

  /**
   * Obtenir les détails d'une agence
   */
  getAgencyDetail(agencyId: number): Observable<Agency> {
    return this.http.get<Agency>(`${this.apiUrl}/${agencyId}`);
  }

  /**
   * Rechercher les agences
   */
  searchAgencies(query: string, city?: string): Observable<Agency[]> {
    let params = new HttpParams().set('search', query);

    if (city) {
      params = params.set('city', city);
    }

    return this.http
      .get<any>(`${this.apiUrl}/search`, { params })
      .pipe(unwrapCollection<Agency>());
  }

  /**
   * Obtenir les points de retrait d'une agence
   */
  getAgencyPoints(agencyId: number): Observable<AgencyPoint[]> {
    return this.http
      .get<any>(`${this.apiUrl}/${agencyId}/points`)
      .pipe(unwrapCollection<AgencyPoint>());
  }

  /**
   * Obtenir les agences populaires
   */
  getPopularAgencies(): Observable<Agency[]> {
    return this.http
      .get<any>(`${this.apiUrl}/popular`)
      .pipe(unwrapCollection<Agency>());
  }

  /**
   * Obtenir les agences par ville
   */
  getAgenciesByCity(city: string): Observable<Agency[]> {
    const params = new HttpParams().set('city', city);
    return this.http
      .get<any>(`${this.apiUrl}/city`, { params })
      .pipe(unwrapCollection<Agency>());
  }

  /**
   * Évaluer une agence
   */
  rateAgency(
    agencyId: number,
    rating: number,
    comment: string,
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/${agencyId}/rate`, {
      rating,
      comment,
    });
  }
}
