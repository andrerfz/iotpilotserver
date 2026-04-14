import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export interface ServerSession {
    userId: string;
    email: string;
    username?: string;
    role: string;
    customerId: string | null;
}

export function sessionIsAdmin(session: ServerSession | null): boolean {
    return session?.role === 'ADMIN' || session?.role === 'SUPERADMIN';
}

export function sessionIsSuperAdmin(session: ServerSession | null): boolean {
    return session?.role === 'SUPERADMIN';
}

export async function getServerSession(): Promise<ServerSession | null> {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return null;

        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        if (!payload?.userId) return null;

        return {
            userId: payload.userId,
            email: payload.email,
            username: payload.username,
            role: payload.role,
            customerId: payload.customerId ?? null,
        };
    } catch {
        return null;
    }
}
