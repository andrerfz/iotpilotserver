import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: 'No token provided' },
                { status: 401 }
            );
        }

        // Verify token
        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Check session exists and is valid
        const session = await prisma.session.findFirst({
            where: {
                token,
                expiresAt: {
                    gt: new Date()
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        role: true,
                        createdAt: true,
                        _count: {
                            select: {
                                devices: true,
                                alerts: true
                            }
                        }
                    }
                }
            }
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session expired' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            user: session.user
        });

    } catch (error) {
        console.error('Me route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}