import {NextRequest, NextResponse} from 'next/server';
import {UserRole} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {tenantPrisma} from '@/lib/tenant-middleware';

// Define UserStatus enum values directly since there's an issue with importing from @prisma/client
enum UserStatus {
    ACTIVE = 'ACTIVE',
    PENDING = 'PENDING',
    SUSPENDED = 'SUSPENDED',
    INACTIVE = 'INACTIVE'
}

// Registration schema
const registrationSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3).max(50),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/)
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, username, password } = registrationSchema.parse(body);

        // Check if user already exists
        const existingUser = await (tenantPrisma.client as any).user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: existingUser.email === email ? 'Email already in use' : 'Username already taken' },
                { status: 400 }
            );
        }

        // Prevent SUPERADMIN creation via API
        if (email.endsWith('@iotpilot.system')) {
            return NextResponse.json(
                { error: 'Invalid email domain' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if company exists by email domain
        const emailDomain = email.split('@')[1];
        const existingCompany = await (tenantPrisma.client as any).customer.findFirst({
            where: { domain: emailDomain }
        });

        // Determine if this is a new company or existing company
        const isNewCompany = !existingCompany;

        // Create customer if it's a new company
        let customerId: string;
        if (isNewCompany) {
            // Generate a slug from the email domain
            const slug = emailDomain.split('.')[0];

            // Create new customer
            const newCustomer = await (tenantPrisma.client as any).customer.create({
                data: {
                    name: `${slug.charAt(0).toUpperCase() + slug.slice(1)} Organization`,
                    slug,
                    domain: emailDomain,
                    status: 'ACTIVE',
                    subscriptionTier: 'FREE'
                }
            });

            customerId = newCustomer.id;
        } else {
            customerId = existingCompany.id;
        }

        // Determine user status and role
        // First user of a new company is auto-approved as ADMIN
        // Users for existing companies start as PENDING
        const userStatus = isNewCompany ? UserStatus.ACTIVE : UserStatus.PENDING;
        const userRole = isNewCompany ? UserRole.ADMIN : UserRole.USER;

        // Create user
        const user = await (tenantPrisma.client as any).user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role: userRole,
                status: userStatus,
                customerId,
                profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`
            }
        });

        // For existing companies, notify admins about pending user
        if (!isNewCompany) {
            // TODO: Implement email notifications
            console.log(`New user ${email} is pending approval for company ${existingCompany.name}`);

            // In a real implementation, we would send emails to company admins here
            // For now, we'll just log it
        }

        // Return appropriate response
        if (isNewCompany) {
            return NextResponse.json({
                message: 'Account created successfully. You can now log in.',
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    status: user.status
                }
            });
        } else {
            return NextResponse.json({
                message: 'Registration submitted. An administrator will approve your account.',
                status: 'PENDING'
            });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { 
                    error: 'Invalid input', 
                    details: error.errors.map(err => ({
                        path: err.path.join('.'),
                        message: err.message
                    }))
                },
                { status: 400 }
            );
        }

        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
