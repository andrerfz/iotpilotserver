import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';

const prisma = new PrismaClient();

const createApiKeySchema = z.object({
    name: z.string().min(1).max(100),
    expiresAt: z.string().datetime().optional()
});

// GET /api/auth/api-keys - List user's API keys
export async function GET(request: NextRequest) {
    try {
        const { user, error } = await authenticate(request);
        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKeys = await prisma.apiKey.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                name: true,
                key: true,
                lastUsed: true,
                expiresAt: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Mask the API keys for security (show only last 4 characters)
        const maskedKeys = apiKeys.map(key => ({
            ...key,
            key: `****${key.key.slice(-4)}`
        }));

        return NextResponse.json({ apiKeys: maskedKeys });

    } catch (error) {
        console.error('Failed to fetch API keys:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/auth/api-keys - Create new API key
export async function POST(request: NextRequest) {
    try {
        const { user, error } = await authenticate(request);
        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, expiresAt } = createApiKeySchema.parse(body);

        // Generate API key
        const apiKey = `iot_${crypto.randomBytes(32).toString('hex')}`;

        // Create API key record
        const newApiKey = await prisma.apiKey.create({
            data: {
                userId: user.id,
                name,
                key: apiKey,
                expiresAt: expiresAt ? new Date(expiresAt) : null
            }
        });

        return NextResponse.json({
            apiKey: {
                id: newApiKey.id,
                name: newApiKey.name,
                key: apiKey, // Return full key only on creation
                expiresAt: newApiKey.expiresAt,
                createdAt: newApiKey.createdAt
            },
            message: 'API key created successfully. Save it securely - you won\'t see it again.'
        }, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid input', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to create API key:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/auth/api-keys/:id - Delete API key
export async function DELETE(request: NextRequest) {
    try {
        const { user, error } = await authenticate(request);
        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const keyId = url.searchParams.get('id');

        if (!keyId) {
            return NextResponse.json(
                { error: 'API key ID is required' },
                { status: 400 }
            );
        }

        // Check if API key belongs to user
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id: keyId,
                userId: user.id
            }
        });

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        // Delete API key
        await prisma.apiKey.delete({
            where: { id: keyId }
        });

        return NextResponse.json({
            message: 'API key deleted successfully'
        });

    } catch (error) {
        console.error('Failed to delete API key:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}