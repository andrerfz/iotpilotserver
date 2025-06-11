'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Check, X } from 'lucide-react';
import PasswordInput from './password-input';
import PasswordRequirements from './password-requirements';

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
        { test: (pwd: string) => pwd.length >= 8, text: 'At least 8 characters' },
        { test: (pwd: string) => /[A-Z]/.test(pwd), text: 'One uppercase letter' },
        { test: (pwd: string) => /[a-z]/.test(pwd), text: 'One lowercase letter' },
        { test: (pwd: string) => /\d/.test(pwd), text: 'One number' }
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
        <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                </label>
                <div className="mt-1">
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="your@email.com"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                </label>
                <div className="mt-1">
                    <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        value={formData.username}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Choose a username"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                </label>
                <div className="mt-1 relative">
                    <PasswordInput
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        placeholder="Create a strong password"
                    />
                </div>

                {/* Password requirements */}
                <PasswordRequirements 
                    password={formData.password} 
                    requirements={passwordRequirements}
                />
            </div>

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                </label>
                <div className="mt-1 relative">
                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        placeholder="Confirm your password"
                    />
                </div>

                {/* Password match indicator */}
                {formData.confirmPassword && (
                    <div className="mt-1 flex items-center text-xs">
                        {passwordsMatch ? (
                            <>
                                <Check className="w-3 h-3 text-green-500 mr-1" />
                                <span className="text-green-600">Passwords match</span>
                            </>
                        ) : (
                            <>
                                <X className="w-3 h-3 text-red-500 mr-1" />
                                <span className="text-red-600">Passwords do not match</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div>
                <button
                    type="submit"
                    disabled={loading || !isPasswordValid || !passwordsMatch}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                        <UserPlus className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                    </span>
                    {loading ? 'Creating account...' : 'Create account'}
                </button>
            </div>

            <div className="text-center">
                <p className="text-xs text-gray-500">
                    By creating an account, you agree to our{' '}
                    <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                        Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                        Privacy Policy
                    </Link>
                </p>
            </div>
        </form>
    );
}