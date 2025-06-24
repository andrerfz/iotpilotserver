import { ValueObject, ValueObjectInterface } from '@/lib/shared/domain/interfaces/value-object.interface';

export interface OrganizationSettingsProps {
  maxUsers?: number;
  maxDevices?: number;
  allowedFeatures?: string[];
  dataRetentionDays?: number;
  customDomain?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export class OrganizationSettings extends ValueObject {
  private readonly maxUsers: number;
  private readonly maxDevices: number;
  private readonly allowedFeatures: string[];
  private readonly dataRetentionDays: number;
  private readonly customDomain: string | null;
  private readonly logoUrl: string | null;
  private readonly primaryColor: string | null;
  private readonly secondaryColor: string | null;

  constructor(props: OrganizationSettingsProps) {
    super();
    this.maxUsers = props.maxUsers || 10;
    this.maxDevices = props.maxDevices || 50;
    this.allowedFeatures = props.allowedFeatures || ['basic'];
    this.dataRetentionDays = props.dataRetentionDays || 30;
    this.customDomain = props.customDomain || null;
    this.logoUrl = props.logoUrl || null;
    this.primaryColor = props.primaryColor || null;
    this.secondaryColor = props.secondaryColor || null;
    this.validate();
  }

  static create(
    maxUsers: number,
    maxDevices: number,
    features: string[] = ['basic'],
    theme: string = 'default',
    customDomain: string | null = null
  ): OrganizationSettings {
    return new OrganizationSettings({
      maxUsers,
      maxDevices,
      allowedFeatures: features,
      customDomain
    });
  }

  private validate(): void {
    if (this.maxUsers < 1) {
      throw new Error('Maximum users must be at least 1');
    }

    if (this.maxDevices < 1) {
      throw new Error('Maximum devices must be at least 1');
    }

    if (this.dataRetentionDays < 1) {
      throw new Error('Data retention days must be at least 1');
    }

    if (this.customDomain && !/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(this.customDomain)) {
      throw new Error('Invalid custom domain format');
    }
  }

  getMaxUsers(): number {
    return this.maxUsers;
  }

  getMaxDevices(): number {
    return this.maxDevices;
  }

  getAllowedFeatures(): string[] {
    return [...this.allowedFeatures];
  }

  getDataRetentionDays(): number {
    return this.dataRetentionDays;
  }

  getCustomDomain(): string | null {
    return this.customDomain;
  }

  getLogoUrl(): string | null {
    return this.logoUrl;
  }

  getPrimaryColor(): string | null {
    return this.primaryColor;
  }

  getSecondaryColor(): string | null {
    return this.secondaryColor;
  }

  hasFeature(feature: string): boolean {
    return this.allowedFeatures.includes(feature);
  }

  equals(other: ValueObjectInterface): boolean {
    if (!(other instanceof OrganizationSettings)) {
      return false;
    }

    return (
      this.maxUsers === other.getMaxUsers() &&
      this.maxDevices === other.getMaxDevices() &&
      JSON.stringify(this.allowedFeatures.sort()) === JSON.stringify(other.getAllowedFeatures().sort()) &&
      this.dataRetentionDays === other.getDataRetentionDays() &&
      this.customDomain === other.getCustomDomain() &&
      this.logoUrl === other.getLogoUrl() &&
      this.primaryColor === other.getPrimaryColor() &&
      this.secondaryColor === other.getSecondaryColor()
    );
  }

  toObject(): OrganizationSettingsProps {
    return {
      maxUsers: this.maxUsers,
      maxDevices: this.maxDevices,
      allowedFeatures: [...this.allowedFeatures],
      dataRetentionDays: this.dataRetentionDays,
      customDomain: this.customDomain || undefined,
      logoUrl: this.logoUrl || undefined,
      primaryColor: this.primaryColor || undefined,
      secondaryColor: this.secondaryColor || undefined
    };
  }
}
