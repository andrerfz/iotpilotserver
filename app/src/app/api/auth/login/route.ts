import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

// LOGIN schema - only email, password, remember
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    remember: z.boolean().optional()
});

export async function POST(request: NextRequest) {
    try {

        const body = await request.json();
        const { email, password, remember } = loginSchema.parse(body);

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                username: true,
                password: true,
                role: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET!,
            { expiresIn: remember ? '7d' : '24h' }
        );

        // Create session
        const expiresAt = new Date();
        expiresAt.setTime(expiresAt.getTime() + (remember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000));

        await prisma.session.create({
            data: {
                userId: user.id,
                token,
                expiresAt
            }
        });

        // Create response
        const response = NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            },
            token
        });

        // Fix: Set cookie without domain for local development
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: false, // Set to false for local HTTP
            sameSite: 'lax',
            // Remove domain entirely for local development
            maxAge: remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60,
            path: '/'
        });

        return response;

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid input', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}