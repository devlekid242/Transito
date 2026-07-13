import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { PartnerPermissionService, PartnerPermissions } from '../services/partner-permission.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Directive pour afficher/masquer des éléments selon les permissions partenaire
 * Utilisation: *appHasPartnerPermission="'canViewDashboard'"
 */
@Directive({
  selector: '[appHasPartnerPermission]',
  standalone: true,
})
export class HasPartnerPermissionDirective implements OnInit, OnDestroy {
  @Input() set appHasPartnerPermission(permission: keyof PartnerPermissions) {
    this.permission = permission;
    this.updateView();
  }

  private permission!: keyof PartnerPermissions;
  private destroy$ = new Subject<void>();

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PartnerPermissionService,
  ) {}

  ngOnInit() {
    this.permissionService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    const hasPermission = this.permissionService.hasPermission(this.permission);

    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}

/**
 * Directive pour afficher/masquer des éléments selon le rôle partenaire
 * Utilisation: *appHasPartnerRole="['AGENT_PARTNER', 'ADMIN_PARTNER']"
 */
@Directive({
  selector: '[appHasPartnerRole]',
  standalone: true,
})
export class HasPartnerRoleDirective implements OnInit, OnDestroy {
  @Input() set appHasPartnerRole(roles: string[]) {
    this.roles = roles;
    this.updateView();
  }

  private roles: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PartnerPermissionService,
  ) {}

  ngOnInit() {
    this.permissionService.partnerRole$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    const hasRole = this.permissionService.hasRole(this.roles as any);

    if (hasRole) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}

/**
 * Directive inverse : afficher si l'utilisateur est un agent de quai
 * Utilisation: *appIfWharfAgent
 */
@Directive({
  selector: '[appIfWharfAgent]',
  standalone: true,
})
export class IfWharfAgentDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PartnerPermissionService,
  ) {}

  ngOnInit() {
    this.permissionService.partnerRole$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    const isWharfAgent = this.permissionService.isWharfAgent();

    if (isWharfAgent) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
