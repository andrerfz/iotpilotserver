'use client';

import { Check, X } from 'lucide-react';

interface PasswordRequirement {
    test: (pwd: string) => boolean;
    text: string;
}

interface PasswordRequirementsProps {
    password: string;
    requirements?: PasswordRequirement[];
}

export default function PasswordRequirements({ 
    password, 
    requirements = [
        { test: (pwd: string) => pwd.length >= 8, text: 'At least 8 characters' },
        { test: (pwd: string) => /[A-Z]/.test(pwd), text: 'One uppercase letter' },
        { test: (pwd: string) => /[a-z]/.test(pwd), text: 'One lowercase letter' },
        { test: (pwd: string) => /\d/.test(pwd), text: 'One number' }
    ]
}: PasswordRequirementsProps) {
    if (!password) return null;

    return (
        <div className="mt-2 space-y-1">
            {requirements.map((req, index) => (
                <div key={index} className="flex items-center text-xs">
                    {req.test(password) ? (
                        <Check className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                        <X className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={req.test(password) ? 'text-green-600' : 'text-red-600'}>
                        {req.text}
                    </span>
                </div>
            ))}
        </div>
    );
}