'use client';

import {useAuth} from '@/contexts/auth-context';
import {useRouter} from 'next/navigation';
import {ChevronDown, LogOut, Settings, Shield, User} from 'lucide-react';
import {
    Avatar,
    Button,
    Chip,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownSection,
    DropdownTrigger
} from '@heroui/react';

export default function UserHeader() {
    const {
        user,
        logout
    } = useAuth();
    const router = useRouter();

    if (!user) return null;

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return 'danger';
            case 'USER':
                return 'primary';
            case 'READONLY':
                return 'default';
            default:
                return 'default';
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return <Shield className="w-3 h-3"/>;
            case 'USER':
                return <User className="w-3 h-3"/>;
            case 'READONLY':
                return <User className="w-3 h-3"/>;
            default:
                return <User className="w-3 h-3"/>;
        }
    };

    return (
        <Dropdown placement="bottom-end">
            <DropdownTrigger>
                <Button
                    variant="ghost"
                    className="h-auto p-2 data-[hover=true]:bg-default-100"
                >
                    <div className="flex items-center gap-3">
                        <Avatar
                            size="sm"
                            src={user?.profileImage ?? undefined}
                            className="bg-default-200 text-default-600"
                            fallback={<User className="w-4 h-4"/>}
                        />
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-foreground">
                                {user.username}
                            </p>
                            <div className="flex items-center gap-1">
                                <Chip
                                    size="sm"
                                    color={getRoleColor(user.role)}
                                    variant="flat"
                                    startContent={getRoleIcon(user.role)}
                                >
                                    {user.role}
                                </Chip>
                            </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-default-500"/>
                    </div>
                </Button>
            </DropdownTrigger>

            <DropdownMenu aria-label="User menu" className="w-56">
                <DropdownSection showDivider>
                    <DropdownItem
                        key="profile"
                        isReadOnly
                        className="h-auto gap-2 opacity-100"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar
                                size="md"
                                src={user?.profileImage ?? undefined}
                                className="bg-default-200 text-default-600"
                                fallback={<User className="w-5 h-5"/>}
                            />
                            <div className="flex flex-col">
                                <p className="text-sm font-medium text-foreground">
                                    {user.username}
                                </p>
                                <p className="text-xs text-default-500">
                                    {user.email}
                                </p>
                                <div className="mt-1">
                                    <Chip
                                        size="sm"
                                        color={getRoleColor(user.role)}
                                        variant="flat"
                                        startContent={getRoleIcon(user.role)}
                                    >
                                        {user.role}
                                    </Chip>
                                </div>
                                {user._count && (
                                    <div className="mt-2 flex gap-4 text-xs text-default-500">
                                        <span>{user._count.devices} devices</span>
                                        <span>{user._count.alerts} alerts</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DropdownItem>
                </DropdownSection>

                <DropdownSection>
                    <DropdownItem
                        key="settings"
                        startContent={<Settings className="w-4 h-4"/>}
                        onPress={() => router.push('/settings/profile')}
                    >
                        Account Settings
                    </DropdownItem>

                    <DropdownItem
                        key="logout"
                        color="danger"
                        startContent={<LogOut className="w-4 h-4"/>}
                        onPress={() => logout()}
                    >
                        Sign Out
                    </DropdownItem>
                </DropdownSection>
            </DropdownMenu>
        </Dropdown>
    );
}
