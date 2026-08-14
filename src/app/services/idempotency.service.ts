import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IdempotencyService {
  create(prefix: string): string {
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `transito-${prefix}-${uuid}`;
  }
}
