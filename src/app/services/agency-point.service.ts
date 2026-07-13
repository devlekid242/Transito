import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from '../../environments/environment';

export interface AgencyPoint {
  id: number;
  agencyId: number;
  city: string;
  name: string;
  phone: string;
  hasVipLounge?: boolean;
  hasWifi?: boolean;
  hasAc?: boolean;
  hasParking?: boolean;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AgencyPointService {
  private apiUrl = `${environment.apiUrl}/agency-points`;

  constructor(private http: HttpClient) {}

  /**
   * Get all agency points
   */
  getAgencyPoints(): Observable<AgencyPoint[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(unwrapCollection<AgencyPoint>());
  }

  /**
   * Get agency points by agency ID
   */
  getPointsByAgency(agencyId: number): Observable<AgencyPoint[]> {
    const params = new HttpParams().set('agency_id', agencyId.toString());
    return this.http
      .get<any>(this.apiUrl, { params })
      .pipe(unwrapCollection<AgencyPoint>());
  }

  /**
   * Get agency points by city
   */
  getPointsByCity(city: string): Observable<AgencyPoint[]> {
    const params = new HttpParams().set('city', city);
    return this.http
      .get<any>(this.apiUrl, { params })
      .pipe(unwrapCollection<AgencyPoint>());
  }

  /**
   * Get single agency point
   */
  getAgencyPoint(pointId: number): Observable<AgencyPoint> {
    return this.http.get<AgencyPoint>(`${this.apiUrl}/${pointId}`);
  }

  /**
   * Create agency point
   */
  createAgencyPoint(point: AgencyPoint): Observable<AgencyPoint> {
    return this.http.post<AgencyPoint>(this.apiUrl, point);
  }

  /**
   * Update agency point
   */
  updateAgencyPoint(
    pointId: number,
    point: Partial<AgencyPoint>,
  ): Observable<AgencyPoint> {
    return this.http.put<AgencyPoint>(`${this.apiUrl}/${pointId}`, point);
  }

  /**
   * Delete agency point
   */
  deleteAgencyPoint(pointId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${pointId}`);
  }
}
