import { Injectable } from '@angular/core';
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

/**
 * Intercepteur HTTP universel pour authentification et rôles
 * Gère les deux types d'utilisateurs: CLIENT et PARTNER
 * - Ajoute le token Bearer à toutes les requêtes
 * - Ajoute les headers de rôles pour partenaires
 * - Ajoute Content-Type application/json si absent
 * - Gère le refresh token automatique en cas d'expiration (401)
 */
@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private refreshPromise: Promise<string | null> | null = null;

  constructor(
    private authService: AuthService,
    private partnerPermissionService: PartnerPermissionService,
  ) {}

  /**
   * Vérifier si la route est une authentification publique
   */
  private isPublicAuthRoute(url: string): boolean {
    return (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/forgot') ||
      url.includes('/auth/verify')
    );
  }

  /**
   * Déterminer le type d'utilisateur (client ou partner)
   */
  private getUserType(): 'client' | 'partner' | 'guest' {
    const role = this.authService.getRole();
    if (role === 'partner') return 'partner';
    if (role === 'client') return 'client';
    return 'guest';
  }

  /**
   * Cloner la requête avec tous les headers nécessaires
   */
  private addAuthHeaders(req: HttpRequest<any>, token: string): HttpRequest<any> {
    const userType = this.getUserType();
    const headers: { [key: string]: string } = {
      Authorization: `Bearer ${token}`,
    };

    // Ajouter les headers spécifiques au type d'utilisateur
    if (userType === 'partner') {
      const partnerRole = this.partnerPermissionService.getPartnerRole();
      headers['X-User-Role'] = 'partner';
      headers['X-Partner-Role'] = partnerRole || 'UNKNOWN';
    } else if (userType === 'client') {
      headers['X-User-Role'] = 'client';
      headers['X-User-Type'] = 'CLIENT';
    }

    // Ajouter Content-Type si absence et que ce n'est pas FormData
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

    const token = this.authService.getToken();
    let authRequest = req;

    if (shouldAttachToken && token) {
      authRequest = this.addAuthHeaders(req, token);
    }

    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Ne pas faire de refresh si:
        // - Ce n'est pas une erreur 401
        // - Ce n'est pas une requête API
        // - C'est une route d'authentification publique
        // - Pas de refresh token disponible
        if (
          error.status !== 401 ||
          !isApiRequest ||
          this.isPublicAuthRoute(req.url) ||
          !this.authService.getRefreshToken()
        ) {
          return throwError(() => error);
        }

        // Eviter les multiples refresh simultanés
        if (!this.refreshPromise) {
          this.refreshPromise = this.authService
            .refreshAccessToken()
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
