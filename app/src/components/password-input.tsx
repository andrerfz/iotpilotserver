'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
    id: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    autoComplete?: string;
    required?: boolean;
}

export default function PasswordInput({
    id,
    name,
    value,
    onChange,
    placeholder = "Enter your password",
    autoComplete = "current-password",
    required = true
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <input
                id={id}
                name={name}
                type={showPassword ? 'text' : 'password'}
                autoComplete={autoComplete}
                required={required}
                value={value}
                onChange={onChange}
                className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={placeholder}
            />
            <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
            >
                {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                )}
            </button>
        </div>
    );
}