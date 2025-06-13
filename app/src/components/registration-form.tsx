'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Check, UserPlus, X} from 'lucide-react';
import PasswordInput from './password-input';
import PasswordRequirements from './password-requirements';
import {Alert, Button, Form, Input, Link as HeroLink, Spacer} from '@heroui/react';

export default function RegistrationForm() {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();

    // Password validation
    const passwordRequirements = [
        {
            test: (pwd: string) => pwd.length >= 8,
            text: 'At least 8 characters'
        },
        {
            test: (pwd: string) => /[A-Z]/.test(pwd),
            text: 'One uppercase letter'
        },
        {
            test: (pwd: string) => /[a-z]/.test(pwd),
            text: 'One lowercase letter'
        },
        {
            test: (pwd: string) => /\d/.test(pwd),
            text: 'One number'
        }
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (!passwordRequirements.every(req => req.test(formData.password))) {
            setError('Password does not meet requirements');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    username: formData.username,
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Redirect to dashboard
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const isPasswordValid = passwordRequirements.every(req => req.test(formData.password));
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';

    return (
        <Form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
                <Alert color="danger" variant="flat" className="mb-4">
                    {error}
                </Alert>
            )}

            <div className="mb-4">
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    label="Email address"
                    placeholder="your@email.com"
                    variant="bordered"
                    fullWidth
                />
            </div>

            <div className="mb-4">
                <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    label="Username"
                    placeholder="Choose a username"
                    variant="bordered"
                    fullWidth
                />
            </div>

            <div className="mb-4">
                <PasswordInput
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    label="Password"
                />

                {/* Password requirements */}
                <PasswordRequirements
                    password={formData.password}
                    requirements={passwordRequirements}
                />
            </div>

            <div className="mb-4">
                <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    label="Confirm Password"
                />

                {/* Password match indicator */}
                {formData.confirmPassword && (
                    <div className="mt-1 flex items-center">
                        {passwordsMatch ? (
                            <>
                                <Check className="w-3 h-3 text-success mr-1"/>
                                <span className="text-xs text-success">Passwords match</span>
                            </>
                        ) : (
                            <>
                                <X className="w-3 h-3 text-danger mr-1"/>
                                <span className="text-xs text-danger">Passwords do not match</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            <Spacer y={2}/>

            <Button
                type="submit"
                color="primary"
                isLoading={loading}
                isDisabled={loading || !isPasswordValid || !passwordsMatch}
                fullWidth
                startContent={<UserPlus className="h-5 w-5"/>}
            >
                {loading ? 'Creating account...' : 'Create account'}
            </Button>

            <div className="text-center">
                <p className="text-xs text-default-500">
                    By creating an account, you agree to our{' '}
                    <HeroLink as={Link} href="/terms" color="primary" size="sm">
                        Terms of Service
                    </HeroLink>{' '}
                    and{' '}
                    <HeroLink as={Link} href="/privacy" color="primary" size="sm">
                        Privacy Policy
                    </HeroLink>
                </p>
            </div>
        </Form>
    );
}
