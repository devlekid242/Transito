import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface MomoOperatorPublicConfig {
  id: string;
  name: string;
  /** % prélevé par l'opérateur à l'encaissement, ajouté au prix payé par le client. */
  collectionFeeRate: number;
}

export interface PaymentConfig {
  platformFee: number;
  momoOperators: MomoOperatorPublicConfig[];
}

interface PaymentConfigResponse {
  success: boolean;
  data: PaymentConfig;
}

/**
 * Frais de service et taux mobile money utilisés pour calculer le prix
 * affiché au client. Vient de l'API (GET /public/payment-config) pour que
 * toute modification faite par un admin (nouveau taux, nouvel opérateur)
 * se reflète immédiatement dans l'app, sans mise à jour de l'application.
 *
 * Les valeurs ci-dessous ne servent QUE de secours si l'API est
 * injoignable (mode hors-ligne, panne réseau) : elles ne doivent jamais
 * être utilisées comme source de vérité pour un calcul réel.
 */
const FALLBACK_CONFIG: PaymentConfig = {
  platformFee: 500,
  momoOperators: [
    { id: 'MTN_MOMO', name: 'MTN MoMo', collectionFeeRate: 3 },
    { id: 'AIRTEL_MOMO', name: 'Airtel Money', collectionFeeRate: 3 },
  ],
};

@Injectable({ providedIn: 'root' })
export class PaymentConfigService {
  private cached$: Observable<PaymentConfig> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Récupère la config paiement, mise en cache en mémoire pour la durée de
   * vie de l'app (elle change rarement). Ne lève jamais d'erreur : retombe
   * sur FALLBACK_CONFIG si l'API est injoignable, pour ne jamais bloquer
   * une réservation à cause d'un problème réseau sur cet appel annexe.
   */
  getConfig(): Observable<PaymentConfig> {
    if (!this.cached$) {
      this.cached$ = this.http
        .get<PaymentConfigResponse>(`${environment.apiUrl}/public/payment-config`)
        .pipe(
          map((response) =>
            response?.success && response.data ? response.data : FALLBACK_CONFIG,
          ),
          catchError((error) => {
            console.error('Failed to load payment config:', error);
            return of(FALLBACK_CONFIG);
          }),
          shareReplay(1),
        );
    }
    return this.cached$;
  }

  /** Calcule le frais momo pour un opérateur donné sur une base donnée (billet + frais app). */
  computeMomoFee(config: PaymentConfig, operatorId: string | null, baseAmount: number): number {
    if (!operatorId) {
      return 0;
    }
    const operator = config.momoOperators.find((op) => op.id === operatorId);
    if (!operator) {
      return 0;
    }
    return Math.round((baseAmount * operator.collectionFeeRate) / 100);
  }
}
