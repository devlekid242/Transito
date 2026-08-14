import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
@Component({selector:'app-pro-login',templateUrl:'./pro-login.page.html',styleUrls:['./pro-login.page.scss'],standalone:true,imports:[IonicModule,CommonModule,FormsModule]})
export class ProLoginPage {
 phoneNumber=''; password=''; error=''; loading=false;
 constructor(private authService:AuthService,private navCtrl:NavController){}
 async login(){this.error='';const d=this.phoneNumber.replace(/\D/g,'');const p=d.startsWith('242')?`+${d}`:`+242${d}`;if(!/^\+242\d{9}$/.test(p)||!this.password){this.error='Veuillez saisir votre numéro et votre mot de passe.';return;}this.loading=true;const ok=await this.authService.login(p,this.password);this.loading=false;if(!ok){this.error='Échec de la connexion. Vérifiez vos identifiants.';return;}this.navCtrl.navigateRoot(this.authService.getRole()==='partner'?'/tabs/partner-dashboard':'/tabs/home');}
 back(){this.navCtrl.navigateBack('/auth/login');}
}
