import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideZoneChangeDetection } from '@angular/core';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { TokenInterceptor } from './app/interceptors/token.interceptor';

import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  alertCircle,
  warning,
  informationCircle,
} from 'ionicons/icons';

addIcons({
  'checkmark-circle': checkmarkCircle,
  'alert-circle': alertCircle,
  'warning': warning,
  'information-circle': informationCircle,
});


bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
    provideRouter(routes, withComponentInputBinding()),
  ],
}).catch((err) => console.error(err));
