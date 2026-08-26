import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';

export interface ErrorDisplayData {
  title?: string;
  message: string;
  icon?: string;
  code?: string;
  details?: string;
  showRetry?: boolean;
}

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="error-container">
      <div class="error-content">
        <ion-icon
          [name]="data.icon || 'alert-circle'"
          class="error-icon"
        ></ion-icon>

        <h2 class="error-title">{{ data.title || 'Erreur' }}</h2>
        <p class="error-message">{{ data.message }}</p>

        <div *ngIf="data.code" class="error-code">
          <span class="code-label">Code d'erreur:</span>
          <span class="code-value">{{ data.code }}</span>
        </div>

        <div *ngIf="data.details" class="error-details">
          <p>{{ data.details }}</p>
        </div>

        <div class="action-buttons">
          <button
            *ngIf="data.showRetry"
            class="btn-retry"
            (click)="onRetry()"
          >
            <ion-icon name="reload" slot="start"></ion-icon>
            Réessayer
          </button>

          <button
            class="btn-back"
            (click)="onGoBack()"
          >
            <ion-icon name="arrow-back" slot="start"></ion-icon>
            Retour
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
      padding: 2rem;
      background: var(--ion-background-color);
    }

    .error-content {
      text-align: center;
      max-width: 500px;
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .error-icon {
      font-size: 4rem;
      color: var(--ion-color-danger);
      margin-bottom: 1rem;
      display: block;
    }

    .error-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--ion-text-color);
      margin: 0.5rem 0;
    }

    .error-message {
      font-size: 1rem;
      color: var(--ion-color-medium);
      margin: 1rem 0;
      line-height: 1.6;
    }

    .error-code {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0;
      padding: 0.5rem 1rem;
      background: #f5f5f5;
      border-radius: 0.4rem;
      font-size: 0.875rem;
    }

    .code-label {
      color: var(--ion-color-medium);
      font-weight: 600;
    }

    .code-value {
      font-family: 'Courier New', monospace;
      color: var(--ion-text-color);
      font-weight: bold;
    }

    .error-details {
      margin: 1rem 0;
      padding: 1rem;
      background: #fffacd;
      border-left: 4px solid #ffd700;
      border-radius: 0.4rem;
      text-align: left;
    }

    .error-details p {
      margin: 0;
      font-size: 0.875rem;
      color: #333;
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
      margin-top: 2rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .btn-retry {
      background: var(--ion-color-success);
      color: white;
    }

    .btn-retry:hover {
      background: var(--ion-color-success-shade);
      transform: scale(1.02);
    }

    .btn-back {
      background: var(--ion-color-medium);
      color: white;
    }

    .btn-back:hover {
      background: var(--ion-color-medium-shade);
      transform: scale(1.02);
    }

    ion-icon {
      font-size: 1rem;
    }
  `],
})
export class ErrorDisplayComponent {
  @Input() data: ErrorDisplayData = {
    message: 'Une erreur est survenue',
  };

  @Output() retry = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  onRetry(): void {
    this.retry.emit();
  }

  onGoBack(): void {
    this.goBack.emit();
  }
}
