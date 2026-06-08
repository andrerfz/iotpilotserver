export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    from?: string;
    text?: string;
}

export interface EmailService {
    send(message: EmailMessage): Promise<void>;
}
