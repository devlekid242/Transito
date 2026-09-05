import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models';
import { unwrapCollection } from '../shared/rxjs-operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Obtenir le profil de l'utilisateur courant
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  /**
   * Obtenir le profil d'un utilisateur
   */
  getUserProfile(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Mettre à jour le profil de l'utilisateur
   */
  updateProfile(userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/me`, userData);
  }

  /**
   * Mettre à jour la photo de profil
   */
  updateProfilePhoto(photo: File): Observable<any> {
    const formData = new FormData();
    formData.append('profile_photo', photo);
    return this.http.post(`${this.apiUrl}/me/photo`, formData);
  }

  /**
   * Changer le mot de passe
   */
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/me/change-password`, {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  /**
   * Ajouter une adresse
   */
  addAddress(address: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/addresses`, address);
  }

  /**
   * Supprimer une adresse
   */
  deleteAddress(addressId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/addresses/${addressId}`);
  }

  /**
   * Obtenir les adresses de l'utilisateur
   */
  getAddresses(): Observable<any[]> {
    return this.http
      .get<any>(`${this.apiUrl}/addresses`)
      .pipe(unwrapCollection<any>());
  }
}
