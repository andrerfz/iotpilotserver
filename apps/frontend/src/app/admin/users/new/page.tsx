'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft, Save, UserPlus} from 'lucide-react';
import {Button, Card, Input, Select, SelectItem} from '@/components/ui';

import {toast} from 'sonner';
import {useAuth} from '@/contexts/auth-context';

interface UserFormData {
    email: string;
    username: string;
    password: string;
    role: string;
    customerId: string;
}

export default function NewUserPage() {
    const router = useRouter();
    const {apiCall} = useAuth();

    const [formData, setFormData] = useState<UserFormData>({
        email: '',
        username: '',
        password: '',
        role: 'USER',
        customerId: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!formData.customerId.trim()) {
                throw new Error('Customer ID is required');
            }

            const response = await apiCall('/api/users', {
                method: 'POST',
                body: JSON.stringify({
                    email: formData.email,
                    username: formData.username,
                    password: formData.password,
                    role: formData.role,
                    customerId: formData.customerId.trim(),
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({error: 'Request failed'}));
                throw new Error(data.error || `Failed with status ${response.status}`);
            }

            toast.success('User created successfully');
            router.push('/admin/users');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An error occurred';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const roleOptions = [
        {key: 'ADMIN', label: 'Admin'},
        {key: 'USER', label: 'User'},
        {key: 'READONLY', label: 'Read-Only'},
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold flex items-center">
                    <UserPlus className="w-6 h-6 mr-2"/>
                    Add New User
                </h1>
                <Button
                    onClick={() => router.push('/admin/users')}
                    variant="bordered"
                    startContent={<ArrowLeft className="w-4 h-4"/>}
                >
                    Back to Users
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
                    {error}
                </div>
            )}

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                placeholder="Enter user email"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                placeholder="Enter username"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                placeholder="Enter password (min 12 characters)"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <Select
                                id="role"
                                selectedKeys={[formData.role]}
                                onSelectionChange={(keys) => setFormData({...formData, role: Array.from(keys)[0] as string})}
                                placeholder="Select role"
                                disabled={loading}
                            >
                                {roleOptions.map((option) => (
                                    <SelectItem key={option.key}>{option.label}</SelectItem>
                                ))}
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
                                Customer ID <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="customerId"
                                value={formData.customerId}
                                onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                                placeholder="Enter the customer/tenant ID this user belongs to"
                                required
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-1">Find the Customer ID in the Admin → Customers list.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="bordered"
                            onClick={() => router.push('/admin/users')}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            isLoading={loading}
                            startContent={<Save className="w-4 h-4"/>}
                        >
                            Create User
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
