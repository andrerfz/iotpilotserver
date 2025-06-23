'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search,
  UserCheck,
  UserX,
  Filter
} from 'lucide-react';
import { Card } from '@heroui/card';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { 
  Select,
  SelectItem,
} from '@heroui/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@heroui/table';
import {
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalHeader
} from '@heroui/modal';

// User type definition
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Status options for filter
  const statusOptions = [
    {key: "", label: "All Statuses"},
    {key: "ACTIVE", label: "Active"},
    {key: "PENDING", label: "Pending"},
    {key: "SUSPENDED", label: "Suspended"},
  ];
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/admin/users?page=${currentPage}`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError('Error loading users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and when filters/pagination change
  useEffect(() => {
    fetchUsers();
  }, [currentPage, statusFilter]);

  // Handle approval/rejection
  const handleUserAction = async () => {
    if (!selectedUser) return;

    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: approvalAction,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${approvalAction} user`);
      }

      // Refresh user list
      fetchUsers();

      // Close dialog
      setApprovalDialogOpen(false);
    } catch (err) {
      setError(`Error ${approvalAction}ing user. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open approval dialog
  const openApprovalDialog = (user: User, action: 'approve' | 'reject') => {
    setSelectedUser(user);
    setApprovalAction(action);
    setApprovalDialogOpen(true);
  };

  // Filter users by search query
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Active</span>;
      case 'PENDING':
        return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Pending</span>;
      case 'SUSPENDED':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs flex items-center"><XCircle className="w-3 h-3 mr-1" /> Suspended</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select 
              className="max-w-xs"
              items={statusOptions}
              label="Filter by status"
              placeholder="Filter by status"
              selectedKeys={[statusFilter]}
              onChange={(key) => setStatusFilter(key.toString())}
            >
              {(status) => <SelectItem key={status.key}>{status.label}</SelectItem>}
            </Select>
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
                      {user.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => openApprovalDialog(user, 'approve')}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => openApprovalDialog(user, 'reject')}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {user.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="flat"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => openApprovalDialog(user, 'reject')}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      )}
                      {user.status === 'SUSPENDED' && (
                        <Button
                          size="sm"
                          variant="flat"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => openApprovalDialog(user, 'approve')}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Reactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
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

      {/* Approval/Rejection Modal */}
      <Modal isOpen={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <ModalContent>
          <ModalHeader>
            <h2 className="text-lg font-semibold">
              {approvalAction === 'approve' ? 'Approve User' : 'Reject User'}
            </h2>
            <p className="text-sm text-gray-500">
              {approvalAction === 'approve'
                ? 'This will grant the user access to the platform.'
                : 'This will prevent the user from accessing the platform.'}
            </p>
          </ModalHeader>

          <ModalBody>
            {selectedUser && (
              <div className="py-2">
                <p className="mb-2"><strong>Username:</strong> {selectedUser.username}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              variant="flat"
              onClick={() => setApprovalDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={approvalAction === 'approve' ? 'solid' : 'bordered'}
              onClick={handleUserAction}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
