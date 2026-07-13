/**
 * Rôles disponibles pour les partenaires.
 * Fichier isolé (aucune dépendance) pour éviter les imports circulaires
 * entre PartnerRoleGuard et PartnerPermissionService, qui référencent
 * tous les deux ce type.
 */
export enum PartnerRole {
  AGENT_PARTNER = 'AGENT_PARTNER', // Accès complet
  WHARF_AGENT = 'agent_quai', // Agent de quai - accès limité
  ADMIN_PARTNER = 'agent_admin', // Admin partenaire - accès complet
}