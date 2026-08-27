import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonToggle,
  NavController,
} from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { PartnerPermissionService } from '../../../services/partner-permission.service';
import { PartnerApiService } from '../../../services/partner-api.service';
import { UiNotificationService } from '../../../services/ui-notification.service';
import { PartnerHeaderComponent } from '../../../components/partner-header/partner-header.component';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader/skeleton-loader.component';
import { environment } from 'src/environments/environment.prod';
@Component({
  selector: 'app-partner-profile',
  templateUrl: './partner-profile.page.html',
  styleUrls: ['./partner-profile.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonToggle,
    CommonModule,
    FormsModule,
    PartnerHeaderComponent,
    SkeletonLoaderComponent,
  ],
})
export class PartnerProfilePage implements OnInit {
  // Permissions
  canEditProfile = false;
  canViewAllFields = false;
  partnerRole: string | null = null;
  loading: boolean = true;

  // Profil complet de l'utilisateur (chargé depuis API)
  userProfile: any = {
    id: 0,
    fullName: '',
    email: '',
    emailVerified: false,
    phoneNumber: '',
    phoneVerified: false,
    profilePhotoUrl: null,
    quartier: '',
    villeResidence: '',
    role: '',
    isActive: true,
    prefLanguage: 'fr',
    prefNotifications: true,
    prefDarkMode: false,
    createdAt: null,
    updatedAt: null,
    agent: {
      id: 0,
      agentRole: '',
      status: 'active',
    },
  };

  // Paramètres de sécurité
  securitySettings = {
    passwordLastModified: '',
    is2FAEnabled: false,
  };

  // Mapping des rôles
  roleLabels: { [key: string]: string } = {
    agent_quai: 'Agent Quai',
    agent_ticketing: 'Agent Ticketing',
    agent_validation: 'Agent Validation',
    admin_agency: 'Administrateur Agence',
    driver: 'Conducteur',
  };

  roleIcons: { [key: string]: string } = {
    agent_quai: 'fa-solid fa-warehouse',
    agent_ticketing: 'fa-solid fa-receipt',
    agent_validation: 'fa-solid fa-circle-check',
    admin_agency: 'fa-solid fa-user-shield',
    driver: 'fa-solid fa-bus',
  };

  // Langues supportées
  languages: { [key: string]: string } = {
    fr: '🇫🇷 Français',
    en: '🇬🇧 English',
    pt: '🇵🇹 Português',
  };

  constructor(
    private navCtrl: NavController,
    private authService: AuthService,
    private permissionService: PartnerPermissionService,
    private apiService: PartnerApiService,
    private notificationService: UiNotificationService,
  ) {}

  ngOnInit() {
    this.loadPermissions();
    this.loadProfile();
  }

  private loadPermissions(): void {
    const permissions = this.permissionService.getPermissions();
    this.canEditProfile = permissions?.canEditProfile || false;
    this.canViewAllFields = this.permissionService.isFullAccessUser();
    this.partnerRole = this.permissionService.getPartnerRole();
  }

  /**
   * Charger le profil partenaire depuis l'API
   */
  private loadProfile(): void {
    this.loading = true;
    this.apiService.getPartnerProfile().subscribe(
      (profile: any) => {
        this.userProfile = {
          id: profile.id || 0,
          fullName: profile.fullName || '',
          email: profile.email || '',
          emailVerified: profile.emailVerified || false,
          phoneNumber: profile.phoneNumber || '',
          phoneVerified: profile.phoneVerified || false,
          profilePhotoUrl: profile.profilePhotoUrl
            ? environment.baseApiUrl + profile.profilePhotoUrl
            : null,
          quartier: profile.quartier || '',
          villeResidence: profile.villeResidence || '',
          role: profile.role || '',
          isActive: profile.isActive || true,
          prefLanguage: profile.prefLanguage || 'fr',
          prefNotifications:
            profile.prefNotifications === 1 ||
            profile.prefNotifications === true,
          prefDarkMode:
            profile.prefDarkMode === 1 || profile.prefDarkMode === true,
          createdAt: profile.createdAt || null,
          updatedAt: profile.updatedAt || null,
          agent: profile.agent || {
            id: 0,
            agentRole: '',
            status: 'active',
          },
        };

        console.log('Profil chargé:', this.userProfile);
        this.loading = false;
      },
      (error: any) => {
        console.error('Erreur lors du chargement du profil:', error);
        this.loading = false;
      },
    );
  }

  // Obtenir l'avatar par défaut en fonction des initiales
  getAvatarInitials(): string {
    const names = this.userProfile.fullName?.split(' ') || [];
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return this.userProfile.fullName?.slice(0, 2).toUpperCase() || 'AP';
  }

  // Obtenir une couleur aléatoire pour l'avatar
  getRandomAvatarColor(): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
    ];
    const hash = this.userProfile.id % colors.length;
    return colors[hash];
  }

  // Formater la date
  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return date;
    }
  }

  // Modification de la photo de profil
  editProfilePhoto() {
    this.navCtrl.navigateForward('/edit-profile-photo');
  }

  // Modifier les informations personnelles
  editPersonalInfo(field: string) {
    this.navCtrl.navigateForward('/edit-user-info');
  }

  // Changer le mot de passe
  changePassword() {
    this.navCtrl.navigateForward('/change-password');
  }

  // Activer ou désactiver l'authentification 2FA
  toggle2FA(event: any) {
    this.securitySettings.is2FAEnabled = event.detail.checked;
    console.log(
      'Statut de la sécurité 2FA modifié :',
      this.securitySettings.is2FAEnabled,
    );
    const status = this.securitySettings.is2FAEnabled
      ? 'activée'
      : 'désactivée';
    this.notificationService.showSuccess(`2FA ${status}`);
  }

  // Basculer les notifications
  toggleNotifications(event: any) {
    this.userProfile.prefNotifications = event.detail.checked;
    this.notificationService.showSuccess(
      `Notifications ${event.detail.checked ? 'activées' : 'désactivées'}`
    );
  }

  // Basculer le mode sombre
  toggleDarkMode(event: any) {
    this.userProfile.prefDarkMode = event.detail.checked;
    this.notificationService.showSuccess(
      `Mode sombre ${event.detail.checked ? 'activé' : 'désactivé'}`
    );
  }

  // Changer la langue
  changeLanguage(lang: string) {
    this.userProfile.prefLanguage = lang;
    this.notificationService.showSuccess(`Langue changée en ${this.languages[lang]}`);
  }

  goBack() {
    this.navCtrl.pop();
  }

  // Déconnexion de l'espace partenaire

  logout() {
    console.log("Déconnexion de l'utilisateur...");
    this.authService.logout();
  }
}
