import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { PartnerPermissionService } from './partner-permission.service';

export interface UserProfile {
  id: number;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  role?: string;
}

interface AuthResponse {
  token: string;
  refresh_token: string;
  user?: {
    id: number;
    fullName: string;
    email: string | null;
    phoneNumber: string;
    roles: string[];
    agent?: {
      agentRole: string;
      status: string;
      agency?: { id: number; name: string };
    };
  };
}

const STORAGE_TOKEN_KEY = 'transito_access_token';
const STORAGE_REFRESH_TOKEN_KEY = 'transito_refresh_token';
const STORAGE_USER_KEY = 'transito_user_profile';
const STORAGE_ROLE_KEY = 'transito_user_role';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiBaseUrl = environment.apiUrl;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private user: UserProfile | null = null;
  private roleSubject = new BehaviorSubject<string | null>(null);
  public role$ = this.roleSubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient,
    private partnerPermission: PartnerPermissionService
  ) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN_KEY);
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);
    const storedRole = localStorage.getItem(STORAGE_ROLE_KEY);

    if (storedToken) {
      this.token = storedToken;
    }
    if (storedRefreshToken) {
      this.refreshToken = storedRefreshToken;
    }

    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch {
        this.user = null;
      }
    }

    if (storedRole) {
      this.roleSubject.next(storedRole);
      if (this.user) this.user.role = storedRole;
    }
  }

  isAuthenticated(): boolean {
    return !!this.token || !!this.refreshToken;
  }

  getToken(): string | null {
    return this.token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getUser(): UserProfile | null {
    return this.user;
  }

  getRole(): string | null {
    return this.roleSubject.value;
  }

  setRole(role: string) {
    this.roleSubject.next(role);
    localStorage.setItem(STORAGE_ROLE_KEY, role);
    if (this.user) this.user.role = role;
  }

  private persistTokens(accessToken: string, refreshToken: string): void {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
    localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, refreshToken);
  }

  private applyAuthResponse(response: AuthResponse): void {
    this.persistTokens(response.token, response.refresh_token);

    if (!response.user) return;

    const role = response.user.roles.includes('ROLE_PARTNER')
      ? 'partner'
      : 'client';

    this.user = {
      id: response.user.id,
      fullName: response.user.fullName,
      email: response.user.email,
      phoneNumber: response.user.phoneNumber,
      role,
    };
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(this.user));
    this.setRole(role);

    const partnerRole = response.user.agent?.agentRole;
    if (partnerRole) {
     this.partnerPermission.setPartnerRole(partnerRole as any);
    }
  }

  async login(phoneNumber: string, password: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiBaseUrl}/auth/login`, {
          phoneNumber,
          password,
        }),
      );

      this.applyAuthResponse(response);
      return true;
    } catch {
      return false;
    }
  }

  async register(
    fullName: string,
    email: string,
    phoneNumber: string,
    villeResidence: string,
    quartier: string,
    emergencyContactName: string,
    emergencyContactPhone: string,
    password: string,
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/auth/register`, {
          fullName,
          email,
          phoneNumber,
          password,
          villeResidence,
          quartier,
          emergencyContactName,
          emergencyContactPhone,
        }),
      );

      return this.login(phoneNumber, password);
    } catch {
      return false;
    }
  }

  async requestReset(phoneNumber: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/auth/request-reset`, {
          phoneNumber,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async verifyReset(
    phoneNumber: string,
    code: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/auth/verify-reset`, {
          phoneNumber,
          code,
          newPassword,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiBaseUrl}/auth/refresh`, {
          refresh_token: this.refreshToken,
        }),
      );

      this.persistTokens(response.token, response.refresh_token);
      return response.token;
    } catch {
      this.logout(false);
      return null;
    }
  }

  logout(redirect = true) {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_ROLE_KEY);
    this.roleSubject.next(null);
    if (redirect) {
      this.router.navigate(['/auth/login']);
    }
  }
}
