import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PartnerRole } from 'src/app/guards/partner-role.enum';

export interface PartnerPermissions {
  canViewDashboard: boolean;
  canAddBus: boolean;
  canAddPoint: boolean;
  canAddTrip: boolean;
  canManageFleet: boolean;
  canBoardingControl: boolean;
  canValidateTickets: boolean;
  canViewTrips: boolean;
  canViewManifest: boolean;
  canViewNotifications: boolean;
  canViewProfile: boolean;
  canEditProfile: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PartnerPermissionService {
  private partnerRoleSubject = new BehaviorSubject<PartnerRole | null>(null);
  public partnerRole$ = this.partnerRoleSubject.asObservable();

  private permissionsSubject = new BehaviorSubject<PartnerPermissions | null>(null);
  public permissions$ = this.permissionsSubject.asObservable();

  constructor() {
    this.loadPartnerRole();
  }

  /**
   * Charger le rôle partenaire depuis le localStorage
   */
  private loadPartnerRole(): void {
    const role = localStorage.getItem('partner_role') as PartnerRole | null;
    if (role) {
      this.setPartnerRole(role);
    }
  }

  /**
   * Définir le rôle partenaire et calculer les permissions
   */
  setPartnerRole(role: PartnerRole): void {
    this.partnerRoleSubject.next(role);
    localStorage.setItem('partner_role', role);
    this.updatePermissions(role);
  }

  /**
   * Obtenir le rôle partenaire actuel
   */
  getPartnerRole(): PartnerRole | null {
    return this.partnerRoleSubject.value;
  }

  /**
   * Obtenir les permissions actuelles
   */
  getPermissions(): PartnerPermissions | null {
    return this.permissionsSubject.value;
  }

  /**
   * Vérifier une permission spécifique
   */
  hasPermission(permission: keyof PartnerPermissions): boolean {
    const permissions = this.permissionsSubject.value;
    if (!permissions) return false;
    return permissions[permission] === true;
  }

  /**
   * Vérifier si l'utilisateur a l'un des rôles spécifiés
   */
  hasRole(roles: PartnerRole[]): boolean {
    const userRole = this.getPartnerRole();
    if (!userRole) return false;
    return roles.includes(userRole);
  }

  /**
   * Mettre à jour les permissions basées sur le rôle
   */
  private updatePermissions(role: PartnerRole): void {
    const permissions: PartnerPermissions = this.calculatePermissions(role);
    this.permissionsSubject.next(permissions);
  }

  /**
   * Calculer les permissions pour un rôle spécifique
   */
  private calculatePermissions(role: PartnerRole): PartnerPermissions {
    const basePermissions: PartnerPermissions = {
      canViewDashboard: false,
      canAddBus: false,
      canAddPoint: false,
      canAddTrip: false,
      canManageFleet: false,
      canBoardingControl: false,
      canValidateTickets: false,
      canViewTrips: false,
      canViewManifest: false,
      canViewNotifications: false,
      canViewProfile: true,
      canEditProfile: true,
    };

    switch (role) {
      case PartnerRole.AGENT_PARTNER:
        return {
          ...basePermissions,
          canViewDashboard: true,
          canAddBus: true,
          canAddPoint: true,
          canAddTrip: true,
          canManageFleet: true,
          canBoardingControl: true,
          canValidateTickets: true,
          canViewTrips: true,
          canViewManifest: true,
          canViewNotifications: true,
        };

      case PartnerRole.WHARF_AGENT:
        return {
          ...basePermissions,
          canValidateTickets: true,
          canViewTrips: true,
          canViewManifest: true,
          canViewNotifications: true,
          canBoardingControl: true,
        };

      case PartnerRole.ADMIN_PARTNER:
        return {
          ...basePermissions,
          canViewDashboard: true,
          canAddBus: true,
          canAddPoint: true,
          canAddTrip: true,
          canManageFleet: true,
          canBoardingControl: true,
          canValidateTickets: true,
          canViewTrips: true,
          canViewManifest: true,
          canViewNotifications: true,
        };

      default:
        return basePermissions;
    }
  }

  /**
   * Vérifier si l'utilisateur est un Agent de Quai (accès limité)
   */
  isWharfAgent(): boolean {
    return this.getPartnerRole() === PartnerRole.WHARF_AGENT;
  }

  /**
   * Vérifier si l'utilisateur est un Agent Partenaire ou Admin
   */
  isFullAccessUser(): boolean {
    const role = this.getPartnerRole();
    return role === PartnerRole.AGENT_PARTNER || role === PartnerRole.ADMIN_PARTNER;
  }

  /**
   * Réinitialiser les permissions (déconnexion)
   */
  reset(): void {
    this.partnerRoleSubject.next(null);
    this.permissionsSubject.next(null);
    localStorage.removeItem('partner_role');
  }
}