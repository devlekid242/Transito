import { Injectable, Injector } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpErrorResponse,
  HttpRequest,
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PartnerPermissionService } from '../services/partner-permission.service';
import { environment } from '../../environments/environment';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private refreshPromise: Promise<string | null> | null = null;
  private authService!: AuthService;

  constructor(
    private injector: Injector, // 👈 On injecte l'Injector à la place de AuthService
    private partnerPermissionService: PartnerPermissionService,
  ) {}

  /**
   * Récupère dynamiquement AuthService pour éviter la dépendance circulaire au démarrage
   */
  private getAuth(): AuthService {
    if (!this.authService) {
      this.authService = this.injector.get(AuthService);
    }
    return this.authService;
  }

  private isPublicAuthRoute(url: string): boolean {
    return (
      url.includes('/auth/login') ||
      url.includes('/auth/request-otp') ||
      url.includes('/auth/verify-otp') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/forgot') ||
      url.includes('/auth/verify') ||
      url.includes('/auth/complete-profile')
    );
  }

  private getUserType(): 'client' | 'partner' | 'guest' {
    const role = this.getAuth().getRole(); // 👈 Utilisation de getAuth()
    if (role === 'partner') return 'partner';
    if (role === 'client') return 'client';
    return 'guest';
  }

  private addAuthHeaders(req: HttpRequest<any>, token: string): HttpRequest<any> {
    const userType = this.getUserType();
    const headers: { [key: string]: string } = {
      Authorization: `Bearer ${token}`,
    };

    if (userType === 'partner') {
      const partnerRole = this.partnerPermissionService.getPartnerRole();
      headers['X-User-Role'] = 'partner';
      headers['X-Partner-Role'] = partnerRole || 'UNKNOWN';
    } else if (userType === 'client') {
      headers['X-User-Role'] = 'client';
      headers['X-User-Type'] = 'CLIENT';
    }

    if (!(req.body instanceof FormData) && !req.headers.has('Content-Type')) {
      headers['Content-Type'] = 'application/json';
    }

    return req.clone({ setHeaders: headers });
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const isApiRequest = req.url.startsWith(environment.apiUrl);
    const shouldAttachToken = isApiRequest && !this.isPublicAuthRoute(req.url);

    const token = this.getAuth().getToken(); // 👈 Utilisation de getAuth()
    let authRequest = req;

    if (shouldAttachToken && token) {
      authRequest = this.addAuthHeaders(req, token);
    }

    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status !== 401 ||
          !isApiRequest ||
          this.isPublicAuthRoute(req.url) ||
          !this.getAuth().getRefreshToken() // 👈 Utilisation de getAuth()
        ) {
          return throwError(() => error);
        }

        if (!this.refreshPromise) {
          this.refreshPromise = this.getAuth()
            .refreshAccessToken() // 👈 Utilisation de getAuth()
            .finally(() => (this.refreshPromise = null));
        }

        return from(this.refreshPromise).pipe(
          switchMap((newToken) => {
            if (!newToken) {
              return throwError(() => error);
            }

            const retriedRequest = this.addAuthHeaders(req, newToken);
            return next.handle(retriedRequest);
          }),
        );
      }),
    );
  }
}