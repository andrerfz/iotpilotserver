'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HardDrive, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Wrench,
  RefreshCw,
  Power
} from 'lucide-react';
import { Button, Card, Input } from '@heroui/react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@heroui/react';

// Device type definition
interface Device {
  id: string;
  deviceId: string;
  hostname: string;
  deviceType: string;
  status: string;
  ipAddress?: string;
  lastSeen?: string;
  alertCount: number;
  userId?: string;
  customerId: string;
}

export default function DeviceManagement() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    maintenance: 0,
    error: 0
  });
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [deviceAction, setDeviceAction] = useState<'restart' | 'maintenance' | 'reset'>('restart');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch devices
  const fetchDevices = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/devices`;
      if (statusFilter) {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }

      const data = await response.json();
      setDevices(data.devices);
      setStats(data.stats);
    } catch (err) {
      setError('Error loading devices. Please try again.');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and when filters change
  useEffect(() => {
    fetchDevices();
  }, [statusFilter]);

  // Handle device action
  const handleDeviceAction = async () => {
    if (!selectedDevice) return;

    setActionLoading(true);

    try {
      // This is a placeholder - in a real implementation, you would call an API endpoint
      // to perform the action on the device
      console.log(`Performing ${deviceAction} on device ${selectedDevice.hostname}`);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh device list
      fetchDevices();

      // Close dialog
      setActionDialogOpen(false);
    } catch (err) {
      setError(`Error performing ${deviceAction} on device. Please try again.`);
      console.error(`Error performing ${deviceAction}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  // Open action dialog
  const openActionDialog = (device: Device, action: 'restart' | 'maintenance' | 'reset') => {
    setSelectedDevice(device);
    setDeviceAction(action);
    setActionDialogOpen(true);
  };

  // Filter devices by search query
  const filteredDevices = devices.filter(device => 
    device.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (device.ipAddress && device.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Online</span>;
      case 'OFFLINE':
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs flex items-center"><XCircle className="w-3 h-3 mr-1" /> Offline</span>;
      case 'MAINTENANCE':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center"><Wrench className="w-3 h-3 mr-1" /> Maintenance</span>;
      case 'ERROR':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Error</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  // Get device type badge
  const getDeviceTypeBadge = (type: string) => {
    return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">{type.replace('_', ' ')}</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Device Management</h1>
        <Button onClick={fetchDevices} variant="flat" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Devices</p>
              <h3 className="text-2xl font-bold">{stats.total}</h3>
            </div>
            <div className="bg-gray-100 p-2 rounded-full">
              <HardDrive className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Online</p>
              <h3 className="text-2xl font-bold">{stats.online}</h3>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Offline</p>
              <h3 className="text-2xl font-bold">{stats.offline}</h3>
            </div>
            <div className="bg-gray-100 p-2 rounded-full">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Issues</p>
              <h3 className="text-2xl font-bold">{stats.error}</h3>
            </div>
            <div className="bg-red-100 p-2 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search devices..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="OFFLINE">Offline</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>Device ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading devices...
                  </TableCell>
                </TableRow>
              ) : filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No devices found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.hostname}</TableCell>
                    <TableCell className="text-xs text-gray-500">{device.deviceId}</TableCell>
                    <TableCell>{getDeviceTypeBadge(device.deviceType)}</TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell>{device.ipAddress || '-'}</TableCell>
                    <TableCell>
                      {device.lastSeen 
                        ? new Date(device.lastSeen).toLocaleString() 
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      {device.alertCount > 0 ? (
                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs">
                          {device.alertCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => router.push(`/devices/${device.id}`)}
                        >
                          View
                        </Button>

                        {device.status === 'ONLINE' && (
                          <Button
                            size="sm"
                            variant="flat"
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => openActionDialog(device, 'restart')}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Restart
                          </Button>
                        )}

                        {device.status !== 'MAINTENANCE' ? (
                          <Button
                            size="sm"
                            variant="flat"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => openActionDialog(device, 'maintenance')}
                          >
                            <Wrench className="h-4 w-4 mr-1" />
                            Maintenance
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="flat"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => openActionDialog(device, 'reset')}
                          >
                            <Power className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Device Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deviceAction === 'restart' && 'Restart Device'}
              {deviceAction === 'maintenance' && 'Set Maintenance Mode'}
              {deviceAction === 'reset' && 'Activate Device'}
            </DialogTitle>
            <DialogDescription>
              {deviceAction === 'restart' && 'This will restart the device. It may be offline for a few minutes.'}
              {deviceAction === 'maintenance' && 'This will put the device in maintenance mode. It will not receive commands.'}
              {deviceAction === 'reset' && 'This will reactivate the device from maintenance mode.'}
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="py-4">
              <p className="mb-2"><strong>Device:</strong> {selectedDevice.hostname}</p>
              <p><strong>ID:</strong> {selectedDevice.deviceId}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="flat"
              onClick={() => setActionDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={deviceAction === 'restart' ? 'default' : deviceAction === 'maintenance' ? 'secondary' : 'default'}
              onClick={handleDeviceAction}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
