import { Injectable } from '@angular/core';
import type { Device } from '@ng/core/api/generated/models/device';

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString();
}

function statusLabel(status?: string | null): string {
  return status ?? '';
}

function toRows(devices: Device[]): Record<string, string | number>[] {
  return devices.map(d => ({
    'ID': d.id ?? '',
    'Hostname': d.hostname ?? '',
    'IP Address': d.ipAddress ?? '',
    'Status': statusLabel(d.status),
    'Device Type': d.deviceType ?? '',
    'Architecture': d.architecture ?? '',
    'Location': d.location ?? '',
    'Last Seen': formatDate(d.lastSeen),
    'Agent Version': d.agentVersion ?? '',
    'CPU Usage (%)': d.cpuUsage ?? '',
    'Memory Usage (%)': d.memoryUsage ?? '',
    'Disk Usage (%)': d.diskUsage ?? '',
  }));
}

@Injectable({ providedIn: 'root' })
export class DeviceExportService {
  async exportXlsx(devices: Device[], filename = 'devices'): Promise<void> {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet(toRows(devices));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Devices');
    writeFile(wb, `${filename}.xlsx`);
  }

  async exportPdf(devices: Device[], filename = 'devices'): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const rows = toRows(devices);
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const body = rows.map(r => headers.map(h => String(r[h] ?? '')));
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Devices', 14, 15);
    autoTable(doc, {
      head: [headers],
      body,
      startY: 22,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    doc.save(`${filename}.pdf`);
  }

  exportCsv(devices: Device[], filename = 'devices'): void {
    const rows = toRows(devices);
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
