'use client';

import {useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {LogIn} from 'lucide-react';
import {useAuth} from '@/contexts/auth-context';
import PasswordInput from './password-input';
import {
    Alert,
    Button,
    Checkbox,
    Form,
    Input,
    Link as HeroLink,
    Spacer
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
    const {
        login,
        user
    } = useAuth();

    console.log('🔐 LOGIN FORM: Current auth state - User:', user?.email, 'Redirect to:', redirectTo);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        console.log('🚀 LOGIN FORM: Form submitted, attempting login...');

        try {
            await login(email, password, remember);

            console.log('✅ LOGIN FORM: Login successful, redirecting to:', redirectTo);
            console.log('👤 LOGIN FORM: Current user after login:', user?.email);

            // Test different redirect methods
            console.log('🔄 LOGIN FORM: Using window.location.href for redirect');
            window.location.href = redirectTo;

        } catch (err) {
            console.log('❌ LOGIN FORM: Login failed:', err);
            setError(err instanceof Error ? err.message : 'Login failed');
            setLoading(false);
        }
    };

    return (
        <Form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
                <Alert
                    color="danger"
                    variant="flat"
                    className="mb-4"
                    title="Login Failed"
                    description={error}
                />
            )}

            <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label="Email address"
                placeholder=""
                variant="bordered"
                size="lg"
                fullWidth
                classNames={{
                    input: "text-base pt-8 pb-2",
                    inputWrapper: "h-16",
                    label: "text-sm"
                }}
            />

            <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder=""
                size="lg"
            />

            <div className="space-y-4 w-full">
                <div className="w-full flex items-center justify-center">
                    <Checkbox
                        id="remember"
                        name="remember"
                        isSelected={remember}
                        onValueChange={setRemember}
                        color="primary"
                        size="sm"
                    >
                        Remember me
                    </Checkbox>
                </div>

                <div className="w-full flex items-center justify-center">
                    <HeroLink
                        as={Link}
                        href="/forgot-password"
                        color="primary"
                        size="sm"
                        className="font-medium"
                    >
                        Forgot password?
                    </HeroLink>
                </div>
            </div>

            <Spacer y={2}/>

            <Button
                type="submit"
                color="primary"
                variant="solid"
                size="lg"
                isLoading={loading}
                isDisabled={loading}
                fullWidth
                startContent={!loading && <LogIn className="h-5 w-5"/>}
                className="font-medium"
            >
                {loading ? 'Signing in...' : 'Sign in'}
            </Button>
        </Form>
    );
}