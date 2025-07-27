import {ValueObject} from '../base.value-object';

class EmailValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailValidationError';
  }
}

export interface EmailProps {
  value: string;
  localPart: string;
  domain: string;
  domainParts: string[];
  isDisposable: boolean;
  isValid: boolean;
}

export class Email extends ValueObject<EmailProps> {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private static readonly DISPOSABLE_DOMAINS = [
    'guerrillamail.com', 'temp-mail.org', '10minutemail.com',
    'mailinator.com', 'yopmail.com', 'sharklasers.com'
  ];

  constructor(props: EmailProps) {
    super(props);
  }

  static fromString(value: string): Email {
    if (!value || typeof value !== 'string') {
      throw new EmailValidationError('Email must be a non-empty string');
    }

    const normalized = value.trim().toLowerCase();

    if (!this.EMAIL_REGEX.test(normalized)) {
      throw new EmailValidationError(`Invalid email format: ${value}`);
    }

    if (normalized.length > 254) {
      throw new EmailValidationError('Email address too long (max 254 characters)');
    }

    const [localPart, domain] = normalized.split('@');
    if (!localPart || !domain) {
      throw new EmailValidationError('Email must contain both local part and domain');
    }

    if (localPart.length > 64) {
      throw new EmailValidationError('Local part too long (max 64 characters)');
    }

    if (domain.length > 253) {
      throw new EmailValidationError('Domain part too long (max 253 characters)');
    }

    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      throw new EmailValidationError('Domain must have at least one dot');
    }

    // Check for disposable email
    const isDisposable = this.DISPOSABLE_DOMAINS.some(d => domain.includes(d));

    const props: EmailProps = {
      value: normalized,
      localPart,
      domain,
      domainParts,
      isDisposable,
      isValid: true
    };

    return new Email(props);
  }

  static create(value: string): Email {
    return this.fromString(value);
  }

  // Getters
  get value(): string {
    return this.props.value;
  }

  get localPart(): string {
    return this.props.localPart;
  }

  get domain(): string {
    return this.props.domain;
  }

  get domainParts(): string[] {
    return this.props.domainParts;
  }

  get tld(): string {
    return this.props.domainParts[this.props.domainParts.length - 1];
  }

  get isDisposable(): boolean {
    return this.props.isDisposable;
  }

  get isValid(): boolean {
    return this.props.isValid;
  }

  // Validation methods
  hasValidTLD(): boolean {
    const validTlds = ['com', 'org', 'net', 'edu', 'gov', 'app', 'io', 'co', 'me'];
    return validTlds.includes(this.tld);
  }

  isCorporateEmail(): boolean {
    const corporateDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    return !corporateDomains.some(d => this.domain === d);
  }

  isGovernmentEmail(): boolean {
    return this.domain.endsWith('.gov') || this.domain.endsWith('.edu');
  }

  // Utility methods
  toString(): string {
    return this.value;
  }


  // Normalization
  normalize(): Email {
    return Email.fromString(this.value);
  }

  // Security methods
  isSafeForStorage(): boolean {
    return !this.isDisposable && this.hasValidTLD();
  }

  // Parsing methods
  getUsername(): string {
    return this.localPart.split('+')[0].split('.')[0]; // Remove +alias and dots
  }

  // Comparison methods
  sameDomainAs(other: Email): boolean {
    if (!other || !(other instanceof Email)) {
      return false;
    }
    return this.domain === other.domain;
  }

  sameOrganizationAs(other: Email): boolean {
    if (!other || !(other instanceof Email)) {
      return false;
    }
    return this.domain === other.domain && this.isCorporateEmail() && other.isCorporateEmail();
  }

  // Generation methods
  generateGrAvatarHash(): string {
    // MD5 hash of lowercase email
    const crypto = require('crypto');
    return crypto.createHash('md5').update(this.value).digest('hex');
  }

  // JSON serialization
  toJSON(): EmailProps {
    return this.props;
  }

  // Display methods
  toDisplayString(): string {
    return this.value;
  }

  // Validation for specific use cases
  isValidForAuthentication(): boolean {
    return this.isValid && !this.isDisposable;
  }

  isValidForNotifications(): boolean {
    return this.isValid && this.hasValidTLD();
  }

  // Type guards
  static isEmail(value: any): value is Email {
    return value instanceof Email;
  }

  // Factory methods for common patterns
  static createPersonal(email: string): Email {
    const emailObj = this.fromString(email);
    if (!emailObj.isCorporateEmail()) {
      throw new EmailValidationError('Personal emails must be from personal domains');
    }
    return emailObj;
  }

  static createCorporate(email: string): Email {
    const emailObj = this.fromString(email);
    if (emailObj.isCorporateEmail()) {
      throw new EmailValidationError('Corporate emails must be from business domains');
    }
    return emailObj;
  }

  getValue(): string {
    return this.value;
  }
}
