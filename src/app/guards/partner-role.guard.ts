import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PartnerPermissionService, PartnerPermissions } from '../services/partner-permission.service';
export { PartnerRole } from './partner-role.enum';

@Injectable({
  providedIn: 'root',
})
export class PartnerRoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private partnerPermission: PartnerPermissionService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // Vérifier que l'utilisateur est authentifié et est un partenaire
    const user = this.authService.getUser();
    const role = this.authService.getRole();

    if (!user || role !== 'partner') {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Obtenir le rôle partner spécifique (source unique: PartnerPermissionService)
    const partnerRole = this.partnerPermission.getPartnerRole();
    if (!partnerRole) {
      console.warn('Rôle partenaire non trouvé');
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Permission requise déclarée explicitement sur la route (data: { permission: 'canXxx' })
    // Si aucune permission n'est déclarée, la route est accessible à tout partenaire authentifié.
    const requiredPermission = route.data?.['permission'] as
      | keyof PartnerPermissions
      | undefined;

    if (!requiredPermission) {
      return true;
    }

    const hasPermission = this.partnerPermission.hasPermission(requiredPermission);

    if (!hasPermission) {
      console.warn(
        `Accès refusé: le rôle ${partnerRole} n'a pas la permission "${requiredPermission}"`,
      );
      // Le dashboard n'exige aucune permission particulière (data.permission absent),
      // donc cette redirection ne peut jamais reboucler.
      this.router.navigate(['/tabs/partner-dashboard']);
      return false;
    }

    return true;
  }
}