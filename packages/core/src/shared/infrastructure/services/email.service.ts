import * as nodemailer from 'nodemailer';
import type { EmailMessage, EmailService } from '@iotpilot/core/shared/domain/interfaces/email-service.interface';
import { StructuredLogger } from '@iotpilot/core/shared/infrastructure/logging/structured-logger';

export class NodemailerEmailService implements EmailService {
    private transporter: nodemailer.Transporter;
    private fromAddress: string;
    private logger: StructuredLogger;

    constructor() {
        this.logger = StructuredLogger.forService('email-service');
        this.fromAddress = `${process.env.FROM_NAME || 'IoT Pilot'} <${process.env.FROM_EMAIL || 'noreply@iotpilot.local'}>`;

        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'mailpit',
            port: parseInt(process.env.SMTP_PORT || '1025'),
            secure: process.env.SMTP_SECURE === 'true',
            ...(process.env.SMTP_USER ? {
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            } : {}),
        });
    }

    async send(message: EmailMessage): Promise<void> {
        const from = message.from || this.fromAddress;
        try {
            await this.transporter.sendMail({
                from,
                to: message.to,
                subject: message.subject,
                html: message.html,
                text: message.text,
            });
            this.logger.info('Email sent', { to: message.to, subject: message.subject });
        } catch (error) {
            this.logger.error('Email send failed', {
                to: message.to,
                subject: message.subject,
                error: (error as Error).message,
            });
            throw error;
        }
    }
}
