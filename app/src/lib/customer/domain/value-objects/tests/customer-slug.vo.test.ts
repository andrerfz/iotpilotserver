import {CustomerSlug} from '../customer-slug.vo';

describe('CustomerSlug Value Object', () => {
    describe('create', () => {
        it('should create a CustomerSlug with valid input', () => {
            const validSlug = 'acme-corp';
            const slug = CustomerSlug.create(validSlug);

            expect(slug).toBeInstanceOf(CustomerSlug);
            expect(slug.getValue()).toBe(validSlug);
        });

        it('should throw error for empty slug', () => {
            expect(() => CustomerSlug.create('')).toThrow('CustomerSlug cannot be empty');
        });

        it('should throw error for whitespace-only slug', () => {
            expect(() => CustomerSlug.create('   ')).toThrow('CustomerSlug cannot be empty');
        });

        it('should throw error for slug longer than 100 characters', () => {
            const longSlug = 'a'.repeat(101);
            expect(() => CustomerSlug.create(longSlug)).toThrow('CustomerSlug cannot be longer than 100 characters');
        });

        it('should throw error for slug with uppercase letters', () => {
            expect(() => CustomerSlug.create('Acme-Corp')).toThrow('CustomerSlug can only contain lowercase letters, numbers, and hyphens');
        });

        it('should throw error for slug with special characters', () => {
            expect(() => CustomerSlug.create('acme@corp')).toThrow('CustomerSlug can only contain lowercase letters, numbers, and hyphens');
        });

        it('should throw error for slug with spaces', () => {
            expect(() => CustomerSlug.create('acme corp')).toThrow('CustomerSlug can only contain lowercase letters, numbers, and hyphens');
        });
    });

    describe('createFromName', () => {
        it('should create a slug from a simple name', () => {
            const slug = CustomerSlug.createFromName('Acme Corp');
            expect(slug.getValue()).toBe('acme-corp');
        });

        it('should create a slug from a name with special characters', () => {
            const slug = CustomerSlug.createFromName('ACME Corp & Sons!');
            expect(slug.getValue()).toBe('acme-corp-sons');
        });

        it('should create a slug from a name with multiple spaces', () => {
            const slug = CustomerSlug.createFromName('ACME   Corp   Solutions');
            expect(slug.getValue()).toBe('acme-corp-solutions');
        });

        it('should create a slug from a name with leading/trailing spaces', () => {
            const slug = CustomerSlug.createFromName('  ACME Corp  ');
            expect(slug.getValue()).toBe('acme-corp');
        });

        it('should create a slug from a name with multiple hyphens', () => {
            const slug = CustomerSlug.createFromName('ACME---Corp---Solutions');
            expect(slug.getValue()).toBe('acme-corp-solutions');
        });

        it('should create a fallback slug for empty name after processing', () => {
            const slug = CustomerSlug.createFromName('!!!');
            expect(slug.getValue()).toBe('customer');
        });

        it('should handle complex names correctly', () => {
            const slug = CustomerSlug.createFromName('TechCorp Inc. - Solutions & Services');
            expect(slug.getValue()).toBe('techcorp-inc-solutions-services');
        });
    });

    describe('equals', () => {
        it('should return true for equal CustomerSlugs', () => {
            const slug1 = CustomerSlug.create('acme-corp');
            const slug2 = CustomerSlug.create('acme-corp');

            expect(slug1.equals(slug2)).toBe(true);
        });

        it('should return false for different CustomerSlugs', () => {
            const slug1 = CustomerSlug.create('acme-corp');
            const slug2 = CustomerSlug.create('tech-corp');

            expect(slug1.equals(slug2)).toBe(false);
        });

        it('should return false for non-CustomerSlug objects', () => {
            const slug = CustomerSlug.create('acme-corp');
            const notSlug = { value: 'acme-corp' };

            expect(slug.equals(notSlug as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the CustomerSlug value as string', () => {
            const slug = CustomerSlug.create('acme-corp');

            expect(slug.toString()).toBe('acme-corp');
        });
    });
});
