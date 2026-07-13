import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

export interface ConfirmModalData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  extraInfo?: string;
}

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar [color]="data.isDangerous ? 'danger' : 'primary'">
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ data.title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="confirm-content">
        <div class="message-section">
          <p class="message text-base text-gray-800">{{ data.message }}</p>

          <div *ngIf="data.extraInfo" class="extra-info bg-blue-50 border border-blue-200 rounded p-3 mt-4">
            <ion-icon name="information-circle" class="text-blue-600"></ion-icon>
            <span class="text-sm text-blue-800 ml-2">{{ data.extraInfo }}</span>
          </div>

          <div *ngIf="data.isDangerous" class="warning-badge bg-red-50 border border-red-200 rounded p-3 mt-4">
            <ion-icon name="warning" class="text-red-600"></ion-icon>
            <span class="text-sm text-red-800 ml-2">Cette action est irréversible</span>
          </div>
        </div>

        <div class="action-buttons mt-6 flex gap-3">
          <button
            (click)="cancel()"
            class="btn-cancel flex-1"
          >
            <ion-icon name="close-circle" slot="start"></ion-icon>
            {{ data.cancelText || 'Annuler' }}
          </button>

          <button
            (click)="confirm()"
            [class.btn-danger]="data.isDangerous"
            [class.btn-success]="!data.isDangerous"
            class="flex-1"
          >
            <ion-icon [name]="data.isDangerous ? 'trash' : 'checkmark-circle'" slot="start"></ion-icon>
            {{ data.confirmText || 'Confirmer' }}
          </button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .confirm-content {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100%;
      padding: 1rem;
    }

    .message-section {
      flex: 1;
    }

    .message {
      margin: 1rem 0;
      color: var(--ion-text-color);
      line-height: 1.6;
    }

    .extra-info {
      display: flex;
      align-items: center;
      padding: 1rem;
      border-radius: 0.5rem;
      background-color: #dbeafe;
      border: 1px solid #93c5fd;
    }

    .extra-info ion-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .extra-info span {
      margin-left: 0.5rem;
      color: #1e40af;
    }

    .warning-badge {
      display: flex;
      align-items: center;
      padding: 1rem;
      border-radius: 0.5rem;
      background-color: #fee2e2;
      border: 1px solid #fecaca;
    }

    .warning-badge ion-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .warning-badge span {
      margin-left: 0.5rem;
      color: #991b1b;
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
      margin-top: 2rem;
    }

    button {
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .btn-cancel {
      background-color: var(--ion-color-medium);
      color: white;
    }

    .btn-cancel:hover {
      background-color: var(--ion-color-medium-shade);
      transform: scale(1.02);
    }

    .btn-success {
      background-color: var(--ion-color-success);
      color: white;
    }

    .btn-success:hover {
      background-color: var(--ion-color-success-shade);
      transform: scale(1.02);
    }

    .btn-danger {
      background-color: var(--ion-color-danger);
      color: white;
    }

    .btn-danger:hover {
      background-color: var(--ion-color-danger-shade);
      transform: scale(1.02);
    }

    ion-icon {
      font-size: 1.25rem;
    }
  `],
})
export class ConfirmModalComponent {
  @Input() data: ConfirmModalData = {
    title: 'Confirmation',
    message: 'Êtes-vous sûr?',
  };

  constructor(private modalController: ModalController) {}

  confirm(): void {
    this.modalController.dismiss({ confirmed: true });
  }

  cancel(): void {
    this.modalController.dismiss({ confirmed: false });
  }
}
