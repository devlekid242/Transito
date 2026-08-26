import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavController, IonContent, IonHeader, IonFooter } from '@ionic/angular';
import { SupportService } from 'src/app/services/support.service';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-support-ticket-detail',
  templateUrl: './support-ticket-detail.page.html',
  imports: [IonContent, IonHeader, IonFooter, CommonModule, ReactiveFormsModule, FormsModule],

})
export class SupportTicketDetailPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  ticketId!: number;
  ticket: any = null;
  isLoading: boolean = true;
  
  newMessage: string = '';
  isSubmitting: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private supportService: SupportService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.ticketId = parseInt(idParam, 10);
      this.loadTicket();
    }
  }

  loadTicket() {
    this.isLoading = true;
    this.supportService.getTicketDetails(this.ticketId).subscribe({
      next: (res) => {
        this.ticket = res;
        this.isLoading = false;
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Erreur lors du chargement du ticket', err);
        this.isLoading = false;
      }
    });
  }

  sendResponse() {
    if (!this.newMessage.trim() || this.isSubmitting) return;

    this.isSubmitting = true;
    this.supportService.addResponse(this.ticketId, this.newMessage).subscribe({
      next: () => {
        // Ajout optimiste au tableau pour une fluidité immédiate
        this.ticket.responses.push({
          message: this.newMessage,
          createdAt: new Date().toISOString(),
          author: { isCurrentUser: true }
        });
        this.newMessage = '';
        this.isSubmitting = false;
        this.scrollToBottom();
      },
      error: (err : any) => {
        console.error("Erreur lors de l'envoi de la réponse", err);
        this.isSubmitting = false;
      }
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      open: 'Ouvert',
      pending: 'En attente',
      answered: 'Répondu',
      closed: 'Fermé'
    };
    return statusMap[status] || status;
  }

  // Permet de scroller automatiquement vers le dernier message
  private scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 150);
  }
}