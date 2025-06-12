'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import PasswordInput from './password-input';
import { 
    Input, 
    Button, 
    Checkbox, 
    Alert, 
    Link as HeroLink, 
    Spacer, 
    Form, 
    FormItem 
} from '@heroui/react';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Use the AuthProvider login method
            await login(email, password, remember);

            // Navigate immediately after successful login
            router.push(redirectTo);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
                <Alert color="danger" variant="flat" className="mb-4">
                    {error}
                </Alert>
            )}

            <FormItem>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    label="Email address"
                    placeholder="Enter your email"
                    variant="bordered"
                    fullWidth
                />
            </FormItem>

            <FormItem>
                <PasswordInput
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                />
            </FormItem>

            <div className="flex items-center justify-between">
                <Checkbox
                    id="remember"
                    name="remember"
                    isSelected={remember}
                    onValueChange={setRemember}
                    color="primary"
                >
                    Remember me for 7 days
                </Checkbox>

                <HeroLink as={Link} href="/forgot-password" color="primary" size="sm">
                    Forgot your password?
                </HeroLink>
            </div>

            <Spacer y={2} />

            <Button
                type="submit"
                color="primary"
                isLoading={loading}
                isDisabled={loading}
                fullWidth
                startContent={<LogIn className="h-5 w-5" />}
            >
                {loading ? 'Signing in...' : 'Sign in'}
            </Button>
        </Form>
    );
}
