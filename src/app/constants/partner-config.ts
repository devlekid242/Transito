/**
 * Configuration des rôles et permissions partenaire
 * Cette fichier centralise toutes les constantes de sécurité
 */

/**
 * Énumération des rôles partenaire
 */
export enum PartnerRole {
  AGENT_PARTNER = 'AGENT_PARTNER',     // Agent partenaire complet
  WHARF_AGENT = 'WHARF_AGENT',         // Agent de quai (accès limité)
  ADMIN_PARTNER = 'ADMIN_PARTNER',     // Administrateur partenaire
}

/**
 * Énumération des permissions
 */
export enum PartnerPermission {
  // Dashboard & Analytics
  VIEW_DASHBOARD = 'canViewDashboard',
  VIEW_STATISTICS = 'canViewStatistics',
  VIEW_REVENUE = 'canViewRevenue',

  // Trip Management
  VIEW_TRIPS = 'canViewTrips',
  ADD_TRIP = 'canAddTrip',
  EDIT_TRIP = 'canEditTrip',
  CANCEL_TRIP = 'canCancelTrip',
  VIEW_MANIFEST = 'canViewManifest',

  // Ticket Validation
  VALIDATE_TICKETS = 'canValidateTickets',
  VIEW_TICKET_STATS = 'canViewTicketStats',

  // Bus Management
  VIEW_BUSES = 'canViewBuses',
  ADD_BUS = 'canAddBus',
  EDIT_BUS = 'canEditBus',
  DELETE_BUS = 'canDeleteBus',

  // Bus Points
  VIEW_BUS_POINTS = 'canViewBusPoints',
  ADD_BUS_POINT = 'canAddBusPoint',
  EDIT_BUS_POINT = 'canEditBusPoint',
  DELETE_BUS_POINT = 'canDeleteBusPoint',

  // Boarding Control
  BOARDING_CONTROL = 'canBoardingControl',
  MANAGE_FLEET = 'canManageFleet',

  // Profile
  VIEW_PROFILE = 'canViewProfile',
  EDIT_PROFILE = 'canEditProfile',

  // Notifications
  VIEW_NOTIFICATIONS = 'canViewNotifications',
  MANAGE_NOTIFICATIONS = 'canManageNotifications',
}

/**
 * Matrice de permissions par rôle
 * Définie quelles permissions chaque rôle possède
 */
export const ROLE_PERMISSIONS: Record<PartnerRole, PartnerPermission[]> = {
  [PartnerRole.AGENT_PARTNER]: [
    // Dashboard & Analytics
    PartnerPermission.VIEW_DASHBOARD,
    PartnerPermission.VIEW_STATISTICS,
    PartnerPermission.VIEW_REVENUE,

    // Trip Management (full access)
    PartnerPermission.VIEW_TRIPS,
    PartnerPermission.ADD_TRIP,
    PartnerPermission.EDIT_TRIP,
    PartnerPermission.CANCEL_TRIP,
    PartnerPermission.VIEW_MANIFEST,

    // Ticket Validation
    PartnerPermission.VALIDATE_TICKETS,
    PartnerPermission.VIEW_TICKET_STATS,

    // Bus Management (full access)
    PartnerPermission.VIEW_BUSES,
    PartnerPermission.ADD_BUS,
    PartnerPermission.EDIT_BUS,
    PartnerPermission.DELETE_BUS,

    // Bus Points (full access)
    PartnerPermission.VIEW_BUS_POINTS,
    PartnerPermission.ADD_BUS_POINT,
    PartnerPermission.EDIT_BUS_POINT,
    PartnerPermission.DELETE_BUS_POINT,

    // Boarding Control
    PartnerPermission.BOARDING_CONTROL,
    PartnerPermission.MANAGE_FLEET,

    // Profile
    PartnerPermission.VIEW_PROFILE,
    PartnerPermission.EDIT_PROFILE,

    // Notifications
    PartnerPermission.VIEW_NOTIFICATIONS,
    PartnerPermission.MANAGE_NOTIFICATIONS,
  ],

  [PartnerRole.WHARF_AGENT]: [
    // Accès très limité - SEULEMENT ce qui est nécessaire pour un agent de quai

    // Ticket Validation (PRIMARY FUNCTION)
    PartnerPermission.VALIDATE_TICKETS,
    PartnerPermission.VIEW_TICKET_STATS,

    // Viewing only
    PartnerPermission.VIEW_TRIPS,
    PartnerPermission.VIEW_MANIFEST,

    // Profile
    PartnerPermission.VIEW_PROFILE,

    // Notifications
    PartnerPermission.VIEW_NOTIFICATIONS,

    // NO dashboard, NO add/edit/delete operations, NO bus management
  ],

  [PartnerRole.ADMIN_PARTNER]: [
    // Accès complet - Identique à AGENT_PARTNER
    PartnerPermission.VIEW_DASHBOARD,
    PartnerPermission.VIEW_STATISTICS,
    PartnerPermission.VIEW_REVENUE,

    PartnerPermission.VIEW_TRIPS,
    PartnerPermission.ADD_TRIP,
    PartnerPermission.EDIT_TRIP,
    PartnerPermission.CANCEL_TRIP,
    PartnerPermission.VIEW_MANIFEST,

    PartnerPermission.VALIDATE_TICKETS,
    PartnerPermission.VIEW_TICKET_STATS,

    PartnerPermission.VIEW_BUSES,
    PartnerPermission.ADD_BUS,
    PartnerPermission.EDIT_BUS,
    PartnerPermission.DELETE_BUS,

    PartnerPermission.VIEW_BUS_POINTS,
    PartnerPermission.ADD_BUS_POINT,
    PartnerPermission.EDIT_BUS_POINT,
    PartnerPermission.DELETE_BUS_POINT,

    PartnerPermission.BOARDING_CONTROL,
    PartnerPermission.MANAGE_FLEET,

    PartnerPermission.VIEW_PROFILE,
    PartnerPermission.EDIT_PROFILE,

    PartnerPermission.VIEW_NOTIFICATIONS,
    PartnerPermission.MANAGE_NOTIFICATIONS,
  ],
};

/**
 * Pages accessibles par rôle
 * Utilisé pour protéger les routes
 */
export const ROLE_PAGES: Record<PartnerRole, string[]> = {
  [PartnerRole.AGENT_PARTNER]: [
    '/tabs/partner-dashboard',
    '/partner-add-trip',
    '/partner-add-bus',
    '/partner-add-point',
    '/tabs/partner-trips',
    '/tabs/partner-control',
    '/tabs/partner-fleet',
    '/partner-validate-ticket',
    '/partner-manifest',
    '/partner-profil',
    '/partner-notifications',
  ],

  [PartnerRole.WHARF_AGENT]: [
    '/partner-validate-ticket',
    '/tabs/partner-trips',
    '/partner-manifest',
    '/partner-profil',
    '/partner-notifications',
  ],

  [PartnerRole.ADMIN_PARTNER]: [
    '/tabs/partner-dashboard',
    '/partner-add-trip',
    '/partner-add-bus',
    '/partner-add-point',
    '/tabs/partner-trips',
    '/tabs/partner-control',
    '/tabs/partner-fleet',
    '/partner-validate-ticket',
    '/partner-manifest',
    '/partner-profil',
    '/partner-notifications',
  ],
};

/**
 * Messages d'erreur personnalisés par permission
 */
export const PERMISSION_ERROR_MESSAGES: Record<PartnerPermission, string> = {
  [PartnerPermission.VIEW_DASHBOARD]: 'Vous n\'avez pas accès au tableau de bord',
  [PartnerPermission.VIEW_STATISTICS]: 'Vous n\'avez pas accès aux statistiques',
  [PartnerPermission.VIEW_REVENUE]: 'Vous n\'avez pas accès aux revenus',
  [PartnerPermission.VIEW_TRIPS]: 'Vous n\'avez pas accès à la liste des trajets',
  [PartnerPermission.ADD_TRIP]: 'Vous n\'avez pas la permission d\'ajouter un trajet',
  [PartnerPermission.EDIT_TRIP]: 'Vous n\'avez pas la permission d\'éditer un trajet',
  [PartnerPermission.CANCEL_TRIP]: 'Vous n\'avez pas la permission d\'annuler un trajet',
  [PartnerPermission.VIEW_MANIFEST]: 'Vous n\'avez pas accès au manifeste',
  [PartnerPermission.VALIDATE_TICKETS]: 'Vous n\'avez pas la permission de valider les tickets',
  [PartnerPermission.VIEW_TICKET_STATS]: 'Vous n\'avez pas accès aux statistiques de tickets',
  [PartnerPermission.VIEW_BUSES]: 'Vous n\'avez pas accès à la liste des bus',
  [PartnerPermission.ADD_BUS]: 'Vous n\'avez pas la permission d\'ajouter un bus',
  [PartnerPermission.EDIT_BUS]: 'Vous n\'avez pas la permission d\'éditer un bus',
  [PartnerPermission.DELETE_BUS]: 'Vous n\'avez pas la permission de supprimer un bus',
  [PartnerPermission.VIEW_BUS_POINTS]: 'Vous n\'avez pas accès aux points de bus',
  [PartnerPermission.ADD_BUS_POINT]: 'Vous n\'avez pas la permission d\'ajouter un point',
  [PartnerPermission.EDIT_BUS_POINT]: 'Vous n\'avez pas la permission d\'éditer un point',
  [PartnerPermission.DELETE_BUS_POINT]: 'Vous n\'avez pas la permission de supprimer un point',
  [PartnerPermission.BOARDING_CONTROL]: 'Vous n\'avez pas accès au contrôle d\'embarquement',
  [PartnerPermission.MANAGE_FLEET]: 'Vous n\'avez pas accès à la gestion de flotte',
  [PartnerPermission.VIEW_PROFILE]: 'Vous n\'avez pas accès au profil',
  [PartnerPermission.EDIT_PROFILE]: 'Vous n\'avez pas la permission d\'éditer le profil',
  [PartnerPermission.VIEW_NOTIFICATIONS]: 'Vous n\'avez pas accès aux notifications',
  [PartnerPermission.MANAGE_NOTIFICATIONS]: 'Vous n\'avez pas la permission de gérer les notifications',
};

/**
 * Descriptions des rôles pour l'UI
 */
export const ROLE_DESCRIPTIONS: Record<PartnerRole, string> = {
  [PartnerRole.AGENT_PARTNER]: 'Agent Partenaire - Accès complet aux fonctionnalités',
  [PartnerRole.WHARF_AGENT]: 'Agent de Quai - Accès limité à la validation de tickets',
  [PartnerRole.ADMIN_PARTNER]: 'Administrateur Partenaire - Accès administrateur complet',
};

/**
 * Labels des rôles pour l'affichage
 */
export const ROLE_LABELS: Record<PartnerRole, string> = {
  [PartnerRole.AGENT_PARTNER]: 'Agent Partenaire',
  [PartnerRole.WHARF_AGENT]: 'Agent de Quai',
  [PartnerRole.ADMIN_PARTNER]: 'Administrateur',
};

/**
 * Badges visuels pour les rôles
 */
export const ROLE_BADGES: Record<PartnerRole, { color: string; icon: string }> = {
  [PartnerRole.AGENT_PARTNER]: {
    color: 'primary',
    icon: 'person-circle',
  },
  [PartnerRole.WHARF_AGENT]: {
    color: 'warning',
    icon: 'alert-circle',
  },
  [PartnerRole.ADMIN_PARTNER]: {
    color: 'danger',
    icon: 'shield-checkmark',
  },
};

/**
 * Aide & Documentation par permission
 */
export const PERMISSION_HELP: Record<PartnerPermission, string> = {
  [PartnerPermission.VIEW_DASHBOARD]:
    'Accédez au tableau de bord pour voir un aperçu de votre activité',
  [PartnerPermission.VIEW_STATISTICS]:
    'Consultez les statistiques détaillées de vos trajets',
  [PartnerPermission.VIEW_REVENUE]:
    'Voir vos revenus générés par les trajets',
  [PartnerPermission.VIEW_TRIPS]:
    'Consulter la liste complète de vos trajets',
  [PartnerPermission.ADD_TRIP]:
    'Créer un nouveau trajet dans le système',
  [PartnerPermission.EDIT_TRIP]:
    'Modifier les détails d\'un trajet existant',
  [PartnerPermission.CANCEL_TRIP]:
    'Annuler un trajet programmé',
  [PartnerPermission.VIEW_MANIFEST]:
    'Voir le manifeste d\'embarquement d\'un trajet',
  [PartnerPermission.VALIDATE_TICKETS]:
    'Scanner et valider les tickets des passagers',
  [PartnerPermission.VIEW_TICKET_STATS]:
    'Voir les statistiques de validation des tickets',
  [PartnerPermission.VIEW_BUSES]:
    'Voir la liste complète des bus disponibles',
  [PartnerPermission.ADD_BUS]:
    'Ajouter un nouveau bus à la flotte',
  [PartnerPermission.EDIT_BUS]:
    'Modifier les informations d\'un bus',
  [PartnerPermission.DELETE_BUS]:
    'Supprimer un bus de la flotte',
  [PartnerPermission.VIEW_BUS_POINTS]:
    'Voir les points de bus (arrêts)',
  [PartnerPermission.ADD_BUS_POINT]:
    'Ajouter un nouveau point de bus',
  [PartnerPermission.EDIT_BUS_POINT]:
    'Modifier les informations d\'un point de bus',
  [PartnerPermission.DELETE_BUS_POINT]:
    'Supprimer un point de bus',
  [PartnerPermission.BOARDING_CONTROL]:
    'Gérer le contrôle d\'embarquement des passagers',
  [PartnerPermission.MANAGE_FLEET]:
    'Gérer complètement la flotte de buses',
  [PartnerPermission.VIEW_PROFILE]:
    'Voir votre profil partenaire',
  [PartnerPermission.EDIT_PROFILE]:
    'Modifier votre profil et vos informations',
  [PartnerPermission.VIEW_NOTIFICATIONS]:
    'Recevoir et voir les notifications',
  [PartnerPermission.MANAGE_NOTIFICATIONS]:
    'Gérer les préférences de notifications',
};
