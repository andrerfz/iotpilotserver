import {CryptoService} from '../interfaces/crypto-service.interface';

export interface DomainEvent {
    readonly occurredOn: Date;
    readonly eventId: string;
    readonly eventType: string;
}

export abstract class DomainEventBase implements DomainEvent {
    readonly occurredOn: Date;
    readonly eventId: string;
    readonly eventType: string;

    constructor(cryptoService?: CryptoService) {
        this.occurredOn = new Date();
        // Use provided cryptoService or fallback to default (for backward compatibility)
        if (cryptoService) {
            this.eventId = cryptoService.randomUUID();
        } else {
            // Fallback for backward compatibility - will be removed in future
            // Try to use global crypto if available (Node.js/browser)
            if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.randomUUID) {
                this.eventId = (globalThis as any).crypto.randomUUID();
            } else if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
                this.eventId = (crypto as any).randomUUID();
            } else {
                throw new Error('CryptoService is required for DomainEventBase. Please provide it in the constructor.');
            }
        }
        this.eventType = this.constructor.name;
    }
}