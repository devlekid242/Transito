import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';

@Component({
  selector: 'app-partner-header',
  templateUrl: './partner-header.component.html',
  styleUrls: ['./partner-header.component.scss'],
  imports: [CommonModule, IonicModule]
})
export class PartnerHeaderComponent {
  @Input() title: string = '';
  @Output() menuClicked = new EventEmitter<void>();

  constructor(private navCtrl: NavController) {}

  goBack(): void {
    this.navCtrl.pop();
  }

  openMenu(): void {
    this.menuClicked.emit();
  }
}