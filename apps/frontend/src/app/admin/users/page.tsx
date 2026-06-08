'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertTriangle, CheckCircle, RefreshCw, Search, UserCheck, UserPlus, UserX, XCircle} from 'lucide-react';
import {Card, Button, Input, Table, TableBody, TableCell, TableHeader, TableRow, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader} from '@/components/ui';

import {useAuth} from '@/contexts/auth-context';
import {toast} from 'sonner';

interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
    createdAt: string;
}

export default function UserManagement() {
    const router = useRouter();
    const {apiCall, user: currentUser} = useAuth();
    const isSuperAdmin = currentUser?.role === 'SUPERADMIN';

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [userAction, setUserAction] = useState<'activate' | 'suspend'>('activate');
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalLoading, setApprovalLoading] = useState<string | null>(null); // userId being approved/rejected

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: '20',
            });
            if (searchQuery) params.set('search', searchQuery);

            const response = await apiCall(`/api/users?${params}`);
            if (!response.ok) throw new Error('Failed to fetch users');

            const body = await response.json();
            setUsers(body.data || []);
            if (body.meta?.pagination) {
                setTotalPages(body.meta.pagination.totalPages || 1);
            }
        } catch (err) {
            setError('Error loading users. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [apiCall, currentPage, searchQuery]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUserAction = async () => {
        if (!selectedUser) return;
        setActionLoading(true);
        try {
            const newStatus = userAction === 'activate' ? 'ACTIVE' : 'INACTIVE';
            const response = await apiCall(`/api/users/${selectedUser.id}`, {
                method: 'PUT',
                body: JSON.stringify({status: newStatus}),
            });
            if (!response.ok) throw new Error(`Failed to ${userAction} user`);
            toast.success(`User ${userAction === 'activate' ? 'activated' : 'suspended'} successfully`);
            await fetchUsers();
            setActionDialogOpen(false);
        } catch (err) {
            toast.error(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproval = async (user: User, action: 'approve' | 'reject') => {
        setApprovalLoading(user.id);
        try {
            const response = await apiCall(`/api/admin/users/${user.id}/approve`, {
                method: 'POST',
                body: JSON.stringify({action}),
            });
            if (!response.ok) throw new Error(`Failed to ${action} user`);
            toast.success(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
            await fetchUsers();
        } catch (err) {
            toast.error(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setApprovalLoading(null);
        }
    };

    const openActionDialog = (user: User, action: 'activate' | 'suspend') => {
        setSelectedUser(user);
        setUserAction(action);
        setActionDialogOpen(true);
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Active</span>;
            case 'PENDING':
                return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Pending</span>;
            case 'SUSPENDED':
            case 'INACTIVE':
                return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs flex items-center"><XCircle className="w-3 h-3 mr-1"/> Suspended</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{status}</span>;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">User Management</h1>
                <div className="flex gap-2">
                    <Button onClick={fetchUsers} variant="flat" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2"/>
                        Refresh
                    </Button>
                    {isSuperAdmin && (
                        <Button
                            onClick={() => router.push('/admin/users/new')}
                            color="primary"
                            size="sm"
                        >
                            <UserPlus className="h-4 w-4 mr-2"/>
                            Add User
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
                    {error}
                </div>
            )}

            <Card className="mb-6">
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400"/>
                        <Input
                            placeholder="Search users..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>Username</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell className="text-right">Actions</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                                {user.role}
                                            </span>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            {isSuperAdmin && (
                                                <div className="flex justify-end gap-2">
                                                    {user.status === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="flat"
                                                                color="success"
                                                                isLoading={approvalLoading === user.id}
                                                                onClick={() => handleApproval(user, 'approve')}
                                                            >
                                                                <UserCheck className="h-4 w-4 mr-1"/>
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="flat"
                                                                color="danger"
                                                                isLoading={approvalLoading === user.id}
                                                                onClick={() => handleApproval(user, 'reject')}
                                                            >
                                                                <XCircle className="h-4 w-4 mr-1"/>
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {(user.status === 'INACTIVE' || user.status === 'SUSPENDED') && (
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                                            onClick={() => openActionDialog(user, 'activate')}
                                                        >
                                                            <UserCheck className="h-4 w-4 mr-1"/>
                                                            Activate
                                                        </Button>
                                                    )}
                                                    {user.status === 'ACTIVE' && (
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                            onClick={() => openActionDialog(user, 'suspend')}
                                                        >
                                                            <UserX className="h-4 w-4 mr-1"/>
                                                            Suspend
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-between items-center p-4 border-t">
                        <Button
                            variant="flat"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-gray-500">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="flat"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </Card>

            <Modal isOpen={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <ModalContent>
                    <ModalHeader>
                        {userAction === 'activate' ? 'Activate User' : 'Suspend User'}
                    </ModalHeader>
                    <ModalBody>
                        {selectedUser && (
                            <div className="py-2">
                                <p className="mb-2"><strong>Username:</strong> {selectedUser.username}</p>
                                <p className="mb-2"><strong>Email:</strong> {selectedUser.email}</p>
                                <p className="text-sm text-gray-500">
                                    {userAction === 'activate'
                                        ? 'This will grant the user access to the platform.'
                                        : 'This will revoke the user\'s access to the platform.'}
                                </p>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
                            Cancel
                        </Button>
                        <Button
                            color={userAction === 'activate' ? 'success' : 'danger'}
                            onClick={handleUserAction}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Processing...' : userAction === 'activate' ? 'Activate' : 'Suspend'}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
