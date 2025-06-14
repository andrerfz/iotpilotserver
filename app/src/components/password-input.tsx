'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@heroui/react';

interface PasswordInputProps {
    id: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    autoComplete?: string;
    required?: boolean;
    label?: string;
    size?: "sm" | "md" | "lg";
}

export default function PasswordInput({
    id,
    name,
    value,
    onChange,
    placeholder = "Enter your password",
    autoComplete = "current-password",
    required = true,
    label = "Password",
    size = "md"
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    const sizeClasses = {
        sm: { input: "text-sm pt-6 pb-2", inputWrapper: "h-12" },
        md: { input: "text-base pt-6 pb-2", inputWrapper: "h-12" },
        lg: { input: "text-base pt-8 pb-2", inputWrapper: "h-16" }
    };

    return (
        <Input
            id={id}
            name={name}
            type={showPassword ? 'text' : 'password'}
            autoComplete={autoComplete}
            required={required}
            value={value}
            onChange={onChange}
            label={label}
            placeholder={placeholder}
            variant="bordered"
            size={size}
            fullWidth
            classNames={{
                input: sizeClasses[size].input,
                inputWrapper: sizeClasses[size].inputWrapper
            }}
            endContent={
                <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="text-default-400 hover:text-default-600"
                    onPress={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                </Button>
            }
        />
    );
}