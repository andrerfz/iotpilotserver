import {OrganizationSettings} from '../organization-settings.vo';

describe('OrganizationSettings Value Object', () => {
    describe('constructor', () => {
        it('should create OrganizationSettings with default values when no props provided', () => {
            const settings = OrganizationSettings.create({});

            expect(settings).toBeInstanceOf(OrganizationSettings);
            expect(settings.getMaxUsers()).toBe(10);
            expect(settings.getMaxDevices()).toBe(50);
            expect(settings.getAllowedFeatures()).toEqual(['basic']);
            expect(settings.getDataRetentionDays()).toBe(30);
            expect(settings.getCustomDomain()).toBeNull();
            expect(settings.getLogoUrl()).toBeNull();
            expect(settings.getPrimaryColor()).toBeNull();
            expect(settings.getSecondaryColor()).toBeNull();
        });

        it('should create OrganizationSettings with provided values', () => {
            const props = {
                maxUsers: 100,
                maxDevices: 500,
                allowedFeatures: ['basic', 'advanced', 'premium'],
                dataRetentionDays: 90,
                customDomain: 'example.com',
                logoUrl: 'https://example.com/logo.png',
                primaryColor: '#FF0000',
                secondaryColor: '#00FF00'
            };
            const settings = OrganizationSettings.create(props);

            expect(settings.getMaxUsers()).toBe(100);
            expect(settings.getMaxDevices()).toBe(500);
            expect(settings.getAllowedFeatures()).toEqual(['basic', 'advanced', 'premium']);
            expect(settings.getDataRetentionDays()).toBe(90);
            expect(settings.getCustomDomain()).toBe('example.com');
            expect(settings.getLogoUrl()).toBe('https://example.com/logo.png');
            expect(settings.getPrimaryColor()).toBe('#FF0000');
            expect(settings.getSecondaryColor()).toBe('#00FF00');
        });

        it('should throw error for maxUsers less than 1', () => {
            expect(() => OrganizationSettings.create({ maxUsers: 0 })).toThrow('Maximum users must be at least 1');
        });

        it('should throw error for maxDevices less than 1', () => {
            expect(() => OrganizationSettings.create({ maxDevices: 0 })).toThrow('Maximum devices must be at least 1');
        });

        it('should throw error for dataRetentionDays less than 1', () => {
            expect(() => OrganizationSettings.create({ dataRetentionDays: 0 })).toThrow('Data retention days must be at least 1');
        });

        it('should throw error for invalid custom domain format', () => {
            expect(() => OrganizationSettings.create({ customDomain: 'invalid-domain' })).toThrow('Invalid custom domain format');
        });
    });

    describe('create static method', () => {
        it('should create OrganizationSettings with provided parameters', () => {
            const settings = OrganizationSettings.create({
                maxUsers: 20,
                maxDevices: 100,
                allowedFeatures: ['basic', 'advanced'],
                customDomain: 'test.com'
            });

            expect(settings.getMaxUsers()).toBe(20);
            expect(settings.getMaxDevices()).toBe(100);
            expect(settings.getAllowedFeatures()).toEqual(['basic', 'advanced']);
            expect(settings.getCustomDomain()).toBe('test.com');
        });

        it('should use default values when parameters not provided', () => {
            const settings = OrganizationSettings.create({
                maxUsers: 15,
                maxDevices: 75
            });

            expect(settings.getMaxUsers()).toBe(15);
            expect(settings.getMaxDevices()).toBe(75);
            expect(settings.getAllowedFeatures()).toEqual(['basic']);
            expect(settings.getCustomDomain()).toBeNull();
        });
    });

    describe('hasFeature', () => {
        it('should return true when feature is allowed', () => {
            const settings = OrganizationSettings.create({
                allowedFeatures: ['basic', 'advanced', 'premium']
            });

            expect(settings.hasFeature('basic')).toBe(true);
            expect(settings.hasFeature('advanced')).toBe(true);
            expect(settings.hasFeature('premium')).toBe(true);
        });

        it('should return false when feature is not allowed', () => {
            const settings = OrganizationSettings.create({
                allowedFeatures: ['basic']
            });

            expect(settings.hasFeature('advanced')).toBe(false);
            expect(settings.hasFeature('premium')).toBe(false);
        });
    });

    describe('getters return copies', () => {
        it('should return a copy of allowedFeatures array to prevent mutation', () => {
            const settings = OrganizationSettings.create({
                allowedFeatures: ['basic', 'advanced']
            });

            const features = settings.getAllowedFeatures();
            features.push('premium');

            expect(settings.getAllowedFeatures()).toEqual(['basic', 'advanced']);
            expect(features).toEqual(['basic', 'advanced', 'premium']);
        });
    });

    describe('equals', () => {
        it('should return true for equal OrganizationSettings', () => {
            const settings1 = OrganizationSettings.create({
                maxUsers: 100,
                maxDevices: 500,
                allowedFeatures: ['basic', 'advanced'],
                dataRetentionDays: 90,
                customDomain: 'example.com',
                logoUrl: 'https://example.com/logo.png',
                primaryColor: '#FF0000',
                secondaryColor: '#00FF00'
            });

            const settings2 = OrganizationSettings.create({
                maxUsers: 100,
                maxDevices: 500,
                allowedFeatures: ['basic', 'advanced'],
                dataRetentionDays: 90,
                customDomain: 'example.com',
                logoUrl: 'https://example.com/logo.png',
                primaryColor: '#FF0000',
                secondaryColor: '#00FF00'
            });

            expect(settings1.equals(settings2)).toBe(true);
        });

        it('should return true for equal OrganizationSettings with different feature order', () => {
            const settings1 = OrganizationSettings.create({
                allowedFeatures: ['basic', 'advanced', 'premium']
            });

            const settings2 = OrganizationSettings.create({
                allowedFeatures: ['premium', 'basic', 'advanced']
            });

            expect(settings1.equals(settings2)).toBe(true);
        });

        it('should return false for different maxUsers', () => {
            const settings1 = OrganizationSettings.create({ maxUsers: 100 });
            const settings2 = OrganizationSettings.create({ maxUsers: 200 });

            expect(settings1.equals(settings2)).toBe(false);
        });

        it('should return false for different maxDevices', () => {
            const settings1 = OrganizationSettings.create({ maxDevices: 100 });
            const settings2 = OrganizationSettings.create({ maxDevices: 200 });

            expect(settings1.equals(settings2)).toBe(false);
        });

        it('should return false for different allowedFeatures', () => {
            const settings1 = OrganizationSettings.create({ allowedFeatures: ['basic'] });
            const settings2 = OrganizationSettings.create({ allowedFeatures: ['advanced'] });

            expect(settings1.equals(settings2)).toBe(false);
        });

        it('should return false for different dataRetentionDays', () => {
            const settings1 = OrganizationSettings.create({ dataRetentionDays: 30 });
            const settings2 = OrganizationSettings.create({ dataRetentionDays: 90 });

            expect(settings1.equals(settings2)).toBe(false);
        });

        it('should return false for different customDomain', () => {
            const settings1 = OrganizationSettings.create({ customDomain: 'example.com' });
            const settings2 = OrganizationSettings.create({ customDomain: 'test.com' });

            expect(settings1.equals(settings2)).toBe(false);
        });

        it('should return false for different logoUrl', () => {
            const settings1 = OrganizationSettings.create({ logoUrl: 'url1' });
            const settings2 = OrganizationSettings.create({ logoUrl: 'url2' });

            expect(settings1.equals(settings2)).toBe(false);
        });

        it('should return false for different primaryColor', () => {
            const settings1 = OrganizationSettings.create({ primaryColor: '#FF0000' });
            const settings2 = OrganizationSettings.create({ primaryColor: '#00FF00' });

            expect(settings1.equals(settings2)).toBe(false);
        });

        it('should return false for different secondaryColor', () => {
            const settings1 = OrganizationSettings.create({ secondaryColor: '#FF0000' });
            const settings2 = OrganizationSettings.create({ secondaryColor: '#00FF00' });

            expect(settings1.equals(settings2)).toBe(false);
        });

        it('should return false for non-OrganizationSettings objects', () => {
            const settings = OrganizationSettings.create({ maxUsers: 100 });
            const notSettings = { maxUsers: 100 };

            expect(settings.equals(notSettings as any)).toBe(false);
        });
    });

    describe('toObject', () => {
        it('should return a plain object representation', () => {
            const props = {
                maxUsers: 100,
                maxDevices: 500,
                allowedFeatures: ['basic', 'advanced'],
                dataRetentionDays: 90,
                customDomain: 'example.com',
                logoUrl: 'https://example.com/logo.png',
                primaryColor: '#FF0000',
                secondaryColor: '#00FF00'
            };
            const settings = OrganizationSettings.create(props);
            const obj = settings.toJSON();

            expect(obj).toEqual({
                maxUsers: 100,
                maxDevices: 500,
                allowedFeatures: ['basic', 'advanced'],
                dataRetentionDays: 90,
                customDomain: 'example.com',
                logoUrl: 'https://example.com/logo.png',
                primaryColor: '#FF0000',
                secondaryColor: '#00FF00'
            });
        });

        it('should return null for null values in toJSON', () => {
            const settings = OrganizationSettings.create({});
            const obj = settings.toJSON();

            expect(obj.customDomain).toBeNull();
            expect(obj.logoUrl).toBeNull();
            expect(obj.primaryColor).toBeNull();
            expect(obj.secondaryColor).toBeNull();
        });
    });

    describe('domain validation', () => {
        it('should accept valid domain formats', () => {
            const validDomains = [
                'example.com',
                'sub.example.com',
                'my-domain.co.uk',
                'test123.org'
            ];

            validDomains.forEach(domain => {
                expect(() => OrganizationSettings.create({ customDomain: domain })).not.toThrow();
            });
        });

        it('should reject invalid domain formats', () => {
            const invalidDomains = [
                'invalid-domain',
                'example',
                'domain with spaces.com',
                'domain..com',
                '-domain.com',
                'domain-.com'
            ];

            invalidDomains.forEach(domain => {
                expect(() => OrganizationSettings.create({ customDomain: domain })).toThrow('Invalid custom domain format');
            });
        });
    });
});
