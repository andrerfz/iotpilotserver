'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft, FileText, RefreshCw, Search, X} from 'lucide-react';
import {Button, Card, CardBody, CardHeader, Input, Select, SelectItem} from '@/components/ui';
import {EmptyState} from '@/components/ui';
import {toast} from 'sonner';
import {useAuth} from '@/contexts/auth-context';

interface DeviceLogsPageProps {
    params: {id: string};
}

interface LogEntry {
    id: string;
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
    message: string;
    source: string | null;
    timestamp: string;
}

interface LogsResponse {
    data: LogEntry[];
    meta: {
        pagination: {total: number; limit: number; offset: number};
        sources: string[];
        levels: string[];
    };
}

const LEVEL_STYLES: Record<string, string> = {
    DEBUG:  'bg-gray-100 text-gray-700 border-gray-300',
    INFO:   'bg-blue-100 text-blue-800 border-blue-200',
    WARN:   'bg-yellow-100 text-yellow-800 border-yellow-300',
    ERROR:  'bg-red-100 text-red-700 border-red-300',
    FATAL:  'bg-red-700 text-white border-red-800',
};

const LEVEL_ROW: Record<string, string> = {
    DEBUG:  '',
    INFO:   '',
    WARN:   'bg-yellow-50',
    ERROR:  'bg-red-50',
    FATAL:  'bg-red-100',
};

function LogLevelBadge({level}: {level: string}) {
    const cls = LEVEL_STYLES[level] ?? 'bg-gray-100 text-gray-700 border-gray-300';
    return (
        <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${cls} min-w-[46px] text-center`}>
            {level}
        </span>
    );
}

const LEVELS = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;
const PAGE_SIZE = 100;

export default function DeviceLogsPage({params}: DeviceLogsPageProps) {
    const router = useRouter();
    const {apiCall} = useAuth();

    const [deviceName, setDeviceName] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [sources, setSources] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [offset, setOffset] = useState(0);

    const [levelFilter, setLevelFilter] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchLogs = useCallback(async (opts: {
        level?: string;
        search?: string;
        source?: string;
        offset?: number;
        showSpinner?: boolean;
    } = {}) => {
        const {
            level = levelFilter,
            search: q = search,
            source = sourceFilter,
            offset: off = offset,
            showSpinner = false,
        } = opts;

        if (showSpinner) setRefreshing(true);

        const params_ = new URLSearchParams({limit: String(PAGE_SIZE), offset: String(off)});
        if (level !== 'ALL') params_.set('level', level);
        if (q) params_.set('search', q);
        if (source) params_.set('source', source);

        try {
            const res = await apiCall(`/api/devices/${params.id}/logs?${params_}`);
            if (!res.ok) throw new Error('Failed to fetch logs');
            const result: LogsResponse = await res.json();
            setLogs(result.data ?? []);
            setTotal(result.meta?.pagination?.total ?? 0);
            if (result.meta?.sources?.length) setSources(result.meta.sources);
        } catch {
            toast.error('Failed to load logs');
        } finally {
            setRefreshing(false);
        }
    }, [params.id, levelFilter, search, sourceFilter, offset, apiCall]);

    // Initial load — fetch device name + logs
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await apiCall(`/api/devices/${params.id}`);
                if (res.ok) {
                    const r = await res.json();
                    const d = r.data ?? r;
                    setDeviceName(d.hostname || d.name || 'Device');
                }
            } catch { /* ignored */ }
            await fetchLogs();
            setLoading(false);
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    // Auto-refresh
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (autoRefresh) {
            timerRef.current = setInterval(() => fetchLogs({showSpinner: false}), 10000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [autoRefresh, fetchLogs]);

    const applyLevel = (level: string) => {
        setLevelFilter(level);
        setOffset(0);
        fetchLogs({level, offset: 0});
    };

    const applySearch = (q: string) => {
        setSearch(q);
        setOffset(0);
        fetchLogs({search: q, offset: 0});
    };

    const applySource = (src: string) => {
        setSourceFilter(src);
        setOffset(0);
        fetchLogs({source: src, offset: 0});
    };

    const clearFilters = () => {
        setLevelFilter('ALL');
        setSearch('');
        setSourceFilter('');
        setOffset(0);
        fetchLogs({level: 'ALL', search: '', source: '', offset: 0});
    };

    const goPage = (dir: 1 | -1) => {
        const next = offset + dir * PAGE_SIZE;
        if (next < 0 || next >= total) return;
        setOffset(next);
        fetchLogs({offset: next});
    };

    const hasFilters = levelFilter !== 'ALL' || search || sourceFilter;
    const page = Math.floor(offset / PAGE_SIZE) + 1;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-default-500">Loading logs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => router.push(`/devices/${params.id}`)}
                        variant="light"
                        size="sm"
                        startContent={<ArrowLeft className="w-4 h-4" />}
                    >
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="w-6 h-6" />
                            Logs — {deviceName}
                        </h1>
                        <p className="text-default-500 text-sm">{total.toLocaleString()} entries</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={autoRefresh ? 'solid' : 'bordered'}
                        color={autoRefresh ? 'primary' : 'default'}
                        size="sm"
                        onClick={() => setAutoRefresh(v => !v)}
                    >
                        {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                    </Button>
                    <Button
                        variant="bordered"
                        size="sm"
                        startContent={<RefreshCw className="w-4 h-4" />}
                        isLoading={refreshing}
                        onClick={() => fetchLogs({showSpinner: true})}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-4">
                <CardBody>
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Level filter pills */}
                        <div className="flex gap-1">
                            {LEVELS.map(l => (
                                <button
                                    key={l}
                                    onClick={() => applyLevel(l)}
                                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors
                                        ${levelFilter === l
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white text-default-600 border-default-200 hover:border-primary'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="flex-1 min-w-[180px]">
                            <Input
                                size="sm"
                                placeholder="Search messages…"
                                value={search}
                                onChange={e => applySearch(e.target.value)}
                                startContent={<Search className="w-3.5 h-3.5 text-default-400" />}
                                endContent={search ? (
                                    <button onClick={() => applySearch('')}>
                                        <X className="w-3.5 h-3.5 text-default-400" />
                                    </button>
                                ) : null}
                            />
                        </div>

                        {/* Source filter */}
                        {sources.length > 0 && (
                            <Select
                                size="sm"
                                placeholder="All sources"
                                selectedKeys={sourceFilter ? [sourceFilter] : []}
                                onSelectionChange={keys => {
                                    const v = Array.from(keys)[0] as string ?? '';
                                    applySource(v);
                                }}
                                className="w-44"
                                aria-label="Source filter"
                            >
                                {['', ...sources].map(s => (
                                    <SelectItem key={s}>{s || 'All sources'}</SelectItem>
                                ))}
                            </Select>
                        )}

                        {hasFilters && (
                            <Button size="sm" variant="light" onClick={clearFilters} startContent={<X className="w-3.5 h-3.5" />}>
                                Clear
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* Log entries */}
            <Card>
                <CardBody className="p-0">
                    {logs.length === 0 ? (
                        <div className="p-8">
                            <EmptyState
                                icon={<FileText className="w-12 h-12 text-default-300" />}
                                title="No logs found"
                                description={hasFilters ? 'Try adjusting your filters' : 'This device has no log entries yet'}
                            />
                        </div>
                    ) : (
                        <div className="divide-y divide-default-100">
                            {logs.map(log => (
                                <div
                                    key={log.id}
                                    className={`flex gap-3 px-4 py-2.5 text-sm font-mono hover:bg-default-50 ${LEVEL_ROW[log.level] ?? ''}`}
                                >
                                    <span className="text-default-400 shrink-0 w-36 text-xs pt-0.5">
                                        {new Date(log.timestamp).toLocaleString([], {
                                            month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                                        })}
                                    </span>
                                    <span className="shrink-0 pt-0.5">
                                        <LogLevelBadge level={log.level} />
                                    </span>
                                    {log.source && (
                                        <span className="text-default-500 shrink-0 max-w-[120px] truncate text-xs pt-0.5">
                                            {log.source}
                                        </span>
                                    )}
                                    <span className="text-default-800 break-all">{log.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Pagination */}
            {total > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-default-500">
                        Page {page} of {totalPages} — {total.toLocaleString()} total
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="bordered" isDisabled={offset === 0} onClick={() => goPage(-1)}>
                            Previous
                        </Button>
                        <Button size="sm" variant="bordered" isDisabled={offset + PAGE_SIZE >= total} onClick={() => goPage(1)}>
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
