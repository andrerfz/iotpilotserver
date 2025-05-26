import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (token) {
            // Delete session from database
            await prisma.session.deleteMany({
                where: { token }
            });
        }

        // Create response
        const response = NextResponse.json({
            message: 'Logged out successfully'
        });

        // Fix: Clear cookie without domain for local development
        response.cookies.set('auth-token', '', {
            httpOnly: true,
            secure: false, // Set to false for local HTTP
            sameSite: 'lax',
            // Remove domain entirely for local development
            maxAge: 0,
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}