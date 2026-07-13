import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          const response = event.body;

          // Vérifier si la réponse contient un membre "member"
          if (response && response.member) {
            // Extraire les données de "member" et les retourner
            const modifiedResponse = { ...response, data: response.member };
            return event.clone({ body: modifiedResponse });
          }

          // Si la réponse est déjà un tableau, la retourner telle quelle
          if (Array.isArray(response)) {
            return event.clone({ body: response });
          }

          // Sinon, retourner la réponse telle quelle
          return event;
        }
        return event;
      })
    );
  }
}