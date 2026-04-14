import {ValueObject} from '@iotpilot/core/shared/domain/base.value-object';

export interface OrganizationSettingsProps {
  maxUsers: number;
  maxDevices: number;
  allowedFeatures: string[];
  dataRetentionDays: number;
  customDomain: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export class OrganizationSettings extends ValueObject<OrganizationSettingsProps> {
  private constructor(props: OrganizationSettingsProps) {
    super(props);
    this.validate();
  }

  static create(props: Partial<OrganizationSettingsProps>): OrganizationSettings {
    return new OrganizationSettings({
      maxUsers: props.maxUsers ?? 10,
      maxDevices: props.maxDevices ?? 50,
      allowedFeatures: props.allowedFeatures ?? ['basic'],
      dataRetentionDays: props.dataRetentionDays ?? 30,
      customDomain: props.customDomain ?? null,
      logoUrl: props.logoUrl ?? null,
      primaryColor: props.primaryColor ?? null,
      secondaryColor: props.secondaryColor ?? null
    });
  }

  static default(): OrganizationSettings {
    return OrganizationSettings.create({});
  }

  private validate(): void {
    if (this.props.maxUsers < 1) {
      throw new Error('Maximum users must be at least 1');
    }

    if (this.props.maxDevices < 1) {
      throw new Error('Maximum devices must be at least 1');
    }

    if (this.props.dataRetentionDays < 1) {
      throw new Error('Data retention days must be at least 1');
    }

    if (this.props.customDomain && !/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(this.props.customDomain)) {
      throw new Error('Invalid custom domain format');
    }
  }

  getMaxUsers(): number {
    return this.props.maxUsers;
  }

  getMaxDevices(): number {
    return this.props.maxDevices;
  }

  getAllowedFeatures(): string[] {
    return [...this.props.allowedFeatures];
  }

  getDataRetentionDays(): number {
    return this.props.dataRetentionDays;
  }

  getCustomDomain(): string | null {
    return this.props.customDomain;
  }

  getLogoUrl(): string | null {
    return this.props.logoUrl;
  }

  getPrimaryColor(): string | null {
    return this.props.primaryColor;
  }

  getSecondaryColor(): string | null {
    return this.props.secondaryColor;
  }

  hasFeature(feature: string): boolean {
    return this.props.allowedFeatures.includes(feature);
  }

  withMaxUsers(maxUsers: number): OrganizationSettings {
    return OrganizationSettings.create({ ...this.props, maxUsers });
  }

  withMaxDevices(maxDevices: number): OrganizationSettings {
    return OrganizationSettings.create({ ...this.props, maxDevices });
  }

  withDataRetentionDays(days: number): OrganizationSettings {
    return OrganizationSettings.create({ ...this.props, dataRetentionDays: days });
  }

  withCustomDomain(domain: string | null): OrganizationSettings {
    return OrganizationSettings.create({ ...this.props, customDomain: domain });
  }

  equals(other: OrganizationSettings): boolean {
    if (!(other instanceof OrganizationSettings)) {
      return false;
    }

    return (
      this.props.maxUsers === other.props.maxUsers &&
      this.props.maxDevices === other.props.maxDevices &&
      JSON.stringify(this.props.allowedFeatures.sort()) === JSON.stringify(other.props.allowedFeatures.sort()) &&
      this.props.dataRetentionDays === other.props.dataRetentionDays &&
      this.props.customDomain === other.props.customDomain &&
      this.props.logoUrl === other.props.logoUrl &&
      this.props.primaryColor === other.props.primaryColor &&
      this.props.secondaryColor === other.props.secondaryColor
    );
  }

  toJSON(): OrganizationSettingsProps {
    return { ...this.props };
  }
}
