import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div *ngIf="isLoading" class="loader-overlay">
      <div class="loader-container">
        <ion-spinner
          [name]="spinnerType"
          [color]="spinnerColor"
          class="spinner"
        ></ion-spinner>
        <p class="loader-text" *ngIf="message">{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(2px);
    }

    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .spinner {
      width: 60px;
      height: 60px;
    }

    .loader-text {
      font-size: 0.875rem;
      color: var(--ion-color-medium);
      margin: 0;
      text-align: center;
    }
  `],
})
export class LoaderComponent {
  @Input() isLoading = false;
  @Input() message: string | null = null;
  @Input() spinnerType: 'bubbles' | 'circles' | 'circular' | 'crescent' | 'dots' | 'lines' = 'crescent';
  @Input() spinnerColor = 'primary';
}
