import {z} from 'zod';
import {UserRoleEnum} from '@iotpilot/core/shared/infrastructure/dto/common.schemas';

export const LoginInputSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    remember: z.boolean().optional(),
});

export const UserResponseSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    username: z.string(),
    role: UserRoleEnum,
    customerId: z.string().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED']).optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    lastLoginAt: z.string().nullable().optional(),
});

export const LoginResponseSchema = z.object({
    user: UserResponseSchema,
    token: z.string(),
});

export const RegisterInputSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3).max(50),
    password: z.string().min(12),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
