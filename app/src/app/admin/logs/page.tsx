'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Clock,
  Filter,
  Download,
  HardDrive
} from 'lucide-react';
import { 
  Card,
  Button,
  Input,
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
  Badge
} from '@heroui/react';

// Log type definition
interface Log {
  id: string;
  deviceId: string;
  level: string;
  message: string;
  source?: string;
  timestamp: string;
  device?: {
    hostname: string;
    deviceId: string;
  };
}

// Device type for filtering
interface Device {
  id: string;
  hostname: string;
  deviceId: string;
}

// Pagination type
interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Filters type
interface Filters {
  sources: string[];
  devices: Device[];
}

export default function LogsViewer() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [deviceFilter, setDeviceFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0
  });
  const [filters, setFilters] = useState<Filters>({
    sources: [],
    devices: []
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch logs
  const fetchLogs = async (page = currentPage) => {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/admin/logs?page=${page}`;

      if (levelFilter) {
        url += `&level=${levelFilter}`;
      }

      if (deviceFilter) {
        url += `&deviceId=${deviceFilter}`;
      }

      if (sourceFilter) {
        url += `&source=${sourceFilter}`;
      }

      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
      setFilters(data.filters);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Error loading logs. Please try again.');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLogs(1);
  }, [levelFilter, deviceFilter, sourceFilter]);

  // When search query changes, debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        fetchLogs(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLogs(page);
  };

  // Get level badge
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'DEBUG':
        return <Badge variant="flat" className="bg-gray-100 text-gray-800">DEBUG</Badge>;
      case 'INFO':
        return <Badge variant="flat" className="bg-blue-100 text-blue-800">INFO</Badge>;
      case 'WARN':
        return <Badge variant="flat" className="bg-amber-100 text-amber-800">WARN</Badge>;
      case 'ERROR':
        return <Badge variant="flat" className="bg-red-100 text-red-800">ERROR</Badge>;
      case 'FATAL':
        return <Badge variant="flat" className="bg-purple-100 text-purple-800">FATAL</Badge>;
      default:
        return <Badge variant="flat">{level}</Badge>;
    }
  };

  // Get level icon
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'DEBUG':
        return <FileText className="h-4 w-4 text-gray-500" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'FATAL':
        return <AlertCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Export logs as CSV
  const exportLogs = () => {
    if (logs.length === 0) return;

    const headers = ['Timestamp', 'Level', 'Device', 'Source', 'Message'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.level,
        log.device?.hostname || 'Unknown',
        log.source || 'Unknown',
        `"${log.message.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_export_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Logs Viewer</h1>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={() => fetchLogs(currentPage)} variant="flat" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportLogs} variant="flat" size="sm" disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
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
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-40">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Log Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Levels</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="FATAL">Fatal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-48">
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Devices</SelectItem>
                {filters.devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.hostname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filters.sources.length > 0 && (
            <div className="w-full sm:w-40">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Log Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sources</SelectItem>
                  {filters.sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Timestamp</TableHead>
                <TableHead className="w-24">Level</TableHead>
                <TableHead className="w-40">Device</TableHead>
                <TableHead className="w-32">Source</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 mx-auto mb-2 animate-spin text-blue-600" />
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <FileText className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getLevelIcon(log.level)}
                        <span className="ml-2">{getLevelBadge(log.level)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <HardDrive className="h-3 w-3 mr-2 text-gray-400" />
                        <span className="font-medium">{log.device?.hostname || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {log.source || 'system'}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.message}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-between items-center p-4 border-t">
            <Button
              variant="flat"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                // Show 5 pages around current page
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="flat"
              size="sm"
              onClick={() => handlePageChange(Math.min(pagination.pages, currentPage + 1))}
              disabled={currentPage === pagination.pages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
