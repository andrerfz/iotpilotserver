/* ============================================================
   IoT Pilot Console — Views
   Each view is COMPOSED from the shared kit. Same Lego, different layouts.
   ============================================================ */
const { DEVICES: DEV, ALERTS, USERS: USR, LOGS, SERIES, KPI } = window.IOT;

/* ---------- helpers ---------- */
function SectionHead({ title, children }) {
  return <div className="spread" style={{ marginBottom: 14 }}><div className="card__title" style={{ fontSize: 14.5 }}>{title}</div><div className="row">{children}</div></div>;
}

/* ============================================================
   1 · DASHBOARD
   ============================================================ */
function DashboardView({ onOpenDevice }) {
  const [devFilter, setDevFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [period, setPeriod] = useState('24h');
  const [regOpen, setRegOpen] = useState(false);
  const [extra, setExtra] = useState([]);
  const toast = useToast();
  const registerDevice = (d) => {
    const id = 'dev_' + Math.random().toString(16).slice(2, 8);
    setExtra(x => [{ id, name: d.host, type: d.type, hw: d.type === 'Gateway' ? 'Heltec LoRa32 V3' : 'ESP32-C3', status: 'PENDING_SETUP', ip: '—', loc: d.loc || '—', cpu: 0, mem: 0, temp: 0, disk: 0, up: '—', fw: '2.4.1', last: 'now' }, ...x]);
    toast('Device registered \u00b7 ' + d.host);
  };

  let rows = [...extra, ...DEV];
  if (devFilter.length) rows = rows.filter(d => devFilter.includes(d.id));
  if (statusFilter.length) rows = rows.filter(d => statusFilter.includes(d.status));

  const cols = [
    { key: 'name', label: 'Device', sortable: true, render: r => (
      <div className="cell"><StatusDot status={r.status} live />
        <div><div className="td-strong">{r.name}</div><div className="td-mono dim" style={{ fontSize: 11 }}>{r.id} · {r.hw}</div></div>
      </div>) },
    { key: 'status', label: 'Status', sortable: true, render: r => <StatusBadge status={r.status} /> },
    { key: 'loc', label: 'Location', render: r => <span className="muted"><Icon name="mapPin" size={13} style={{ verticalAlign: -2, marginRight: 5, opacity: .6 }} />{r.loc}</span> },
    { key: 'cpu', label: 'CPU', sortable: true, render: r => <span className="td-mono">{r.status === 'ONLINE' || r.status === 'ERROR' ? r.cpu + '%' : '—'}</span> },
    { key: 'temp', label: 'Temp', sortable: true, render: r => <span className="td-mono">{r.temp ? r.temp + '°C' : '—'}</span> },
    { key: 'last', label: 'Last seen', render: r => <span className="td-mono dim">{r.last}</span> },
    { key: 'go', label: '', width: 40, render: () => <Icon name="chevRight" size={15} style={{ color: 'var(--text-dim)' }} /> },
  ];

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <div className="pagehead__title">Fleet overview</div>
          <div className="pagehead__sub">Real-time health across {KPI.total} devices · 3 sites</div>
        </div>
        <div className="pagehead__actions">
          <Button variant="ghost" icon="download">Export</Button>
          <Button variant="primary" icon="plus" onClick={() => setRegOpen(true)}>Register device</Button>
        </div>
      </div>

      <div className="metrics">
        <MetricCard icon="wifi" iconColor="var(--success)" label="Online" value={`${KPI.online}/${KPI.total}`} delta="+1 vs yesterday" deltaDir="up" spark={SERIES.net} />
        <MetricCard icon="bell" iconColor="var(--danger)" label="Open alerts" value={KPI.openAlerts} delta="2 critical" deltaDir="down" spark={SERIES.alertsTrend} />
        <MetricCard icon="cpu" iconColor="var(--primary)" label="Avg CPU" value={KPI.avgCpu} unit="%" delta="−4% vs 24h" deltaDir="up" spark={SERIES.fleetCpu} />
        <MetricCard icon="activity" iconColor="var(--info)" label="Ingest rate" value={KPI.throughput} unit="pts/s" delta="stable" deltaDir="flat" spark={SERIES.cpu} />
      </div>

      <div className="grid-2">
        <div>
          <SectionHead title="Devices">
            <DevicePicker value={devFilter} onChange={setDevFilter} />
            <MultiSelectPicker value={statusFilter} onChange={setStatusFilter} label="Status" icon="filter"
              title="Filter by status" sub="Show only devices in these states"
              options={[
                { value: 'ONLINE', label: 'Online', dot: 'online' },
                { value: 'OFFLINE', label: 'Offline', dot: 'offline' },
                { value: 'MAINTENANCE', label: 'Maintenance', dot: 'maintenance' },
                { value: 'ERROR', label: 'Error', dot: 'error' },
                { value: 'PENDING_SETUP', label: 'Pending setup', dot: 'pending_setup' },
              ]} />
          </SectionHead>
          <DataTable columns={cols} rows={rows} pageSize={6} onRowClick={r => onOpenDevice(r.id)} kitName="DataTable · devices" />
        </div>

        <div className="stack">
          <div className="card" data-kit="Card · alert feed">
            <div className="card__head"><Icon name="bell" size={16} style={{ color: 'var(--danger)' }} /><span className="card__title">Live alerts</span><span className="label">{ALERTS.filter(a => a.state === 'OPEN').length} open</span></div>
            <div>
              {ALERTS.filter(a => a.state !== 'RESOLVED').slice(0, 5).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 11, padding: '11px 16px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                  <span className={`sev-bar sev-bar--${a.sev}`} style={{ height: 34 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 550 }}>{a.title}</div>
                    <div className="td-mono dim" style={{ fontSize: 11, marginTop: 2 }}>{a.device} · {a.value}</div>
                  </div>
                  <span className="td-mono dim" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{a.age}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" data-kit="Card · throughput">
            <div className="card__head"><Icon name="activity" size={16} style={{ color: 'var(--info)' }} /><span className="card__title">Fleet CPU</span>
              <DateRangePicker value={period} onChange={setPeriod} />
            </div>
            <div className="card__body" style={{ paddingTop: 8 }}>
              <Chart data={SERIES.fleetCpu} height={150} unit="%" color="var(--info)" yMax={100} />
            </div>
          </div>
        </div>
      </div>

      <RegisterDeviceSheet open={regOpen} onClose={() => setRegOpen(false)} onRegister={registerDevice} />
    </div>
  );
}

/* ============================================================
   1b · DEVICES LIST (dedicated fleet page)
   ============================================================ */
function DevicesListView({ onOpenDevice }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [regOpen, setRegOpen] = useState(false);
  const [extra, setExtra] = useState([]);
  const toast = useToast();

  const registerDevice = (d) => {
    const id = 'dev_' + Math.random().toString(16).slice(2, 8);
    setExtra(x => [{ id, name: d.host, type: d.type, hw: d.type === 'Gateway' ? 'Heltec LoRa32 V3' : 'ESP32-C3', status: 'PENDING_SETUP', ip: '—', loc: d.loc || '—', cpu: 0, mem: 0, temp: 0, disk: 0, up: '—', fw: '2.4.1', last: 'just now' }, ...x]);
    toast('Device registered · ' + d.host);
  };

  let rows = [...extra, ...DEV];
  if (q) rows = rows.filter(d => (d.name + d.id + d.loc + d.hw).toLowerCase().includes(q.toLowerCase()));
  if (statusFilter.length) rows = rows.filter(d => statusFilter.includes(d.status));

  const online = rows.filter(d => d.status === 'ONLINE').length;
  const errors = rows.filter(d => d.status === 'ERROR' || d.status === 'OFFLINE').length;
  const pending = rows.filter(d => d.status === 'PENDING_SETUP' || d.status === 'MAINTENANCE').length;

  const cols = [
    { key: 'name', label: 'Device', sortable: true, render: r => (
      <div className="cell"><StatusDot status={r.status} live />
        <div><div className="td-strong">{r.name}</div><div className="td-mono dim" style={{ fontSize: 11 }}>{r.id} · {r.hw}</div></div>
      </div>) },
    { key: 'type', label: 'Type', render: r => <span className="badge badge--neutral">{r.type}</span> },
    { key: 'status', label: 'Status', sortable: true, render: r => <StatusBadge status={r.status} /> },
    { key: 'loc', label: 'Location', render: r => <span className="muted"><Icon name="mapPin" size={13} style={{ verticalAlign: -2, marginRight: 5, opacity: .6 }} />{r.loc}</span> },
    { key: 'ip', label: 'IP', render: r => <span className="td-mono dim">{r.ip}</span> },
    { key: 'cpu', label: 'CPU', sortable: true, render: r => <span className="td-mono">{r.cpu > 0 ? r.cpu + '%' : '—'}</span> },
    { key: 'temp', label: 'Temp', sortable: true, render: r => <span className="td-mono">{r.temp > 0 ? r.temp + '°C' : '—'}</span> },
    { key: 'fw', label: 'Firmware', render: r => <span className="td-mono dim">{r.fw}</span> },
    { key: 'last', label: 'Last seen', render: r => <span className="td-mono dim">{r.last}</span> },
  ];

  return (
    <div className="page page--wide">
      <div className="pagehead">
        <div><div className="pagehead__title">Devices</div><div className="pagehead__sub">{rows.length} devices registered · 3 sites</div></div>
        <div className="pagehead__actions">
          <Button variant="ghost" icon="download">Export</Button>
          <Button variant="primary" icon="plus" onClick={() => setRegOpen(true)}>Register device</Button>
        </div>
      </div>
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <MetricCard icon="wifi" iconColor="var(--success)" label="Online" value={online} delta={`of ${rows.length} total`} deltaDir="flat" />
        <MetricCard icon="wifiOff" iconColor="var(--danger)" label="Offline / Error" value={errors} delta={errors > 0 ? 'attention needed' : 'all clear'} deltaDir={errors > 0 ? 'down' : 'flat'} />
        <MetricCard icon="clock" iconColor="var(--warning)" label="Maintenance / Pending" value={pending} />
        <MetricCard icon="zap" iconColor="var(--primary)" label="Firmware current" value={DEV.filter(d => d.fw === '2.4.1').length} delta={`of ${rows.length}`} deltaDir="flat" />
      </div>
      <div className="filterbar">
        <div className="field" style={{ width: 280 }}><Icon name="search" size={15} /><input placeholder="Search name, ID, location, hardware…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <MultiSelectPicker value={statusFilter} onChange={setStatusFilter} label="Status" icon="filter"
          title="Filter by status" sub="Show only these device states"
          options={[
            { value: 'ONLINE', label: 'Online', dot: 'online' },
            { value: 'OFFLINE', label: 'Offline', dot: 'offline' },
            { value: 'MAINTENANCE', label: 'Maintenance', dot: 'maintenance' },
            { value: 'ERROR', label: 'Error', dot: 'error' },
            { value: 'PENDING_SETUP', label: 'Pending setup', dot: 'pending_setup' },
          ]} />
        <div className="filterbar__spacer" />
        <span className="label">{rows.length} devices</span>
      </div>
      <DataTable columns={cols} rows={rows} pageSize={8} selectable onRowClick={r => onOpenDevice(r.id)}
        kitName="DataTable · all devices"
        renderActions={(sel, clear) => (
          <><div style={{ flex: 1 }} />
            <Button size="sm" variant="ghost" icon="zap" onClick={() => { toast(`Firmware update queued for ${sel.length} devices`); clear(); }}>Update firmware</Button>
            <Button size="sm" variant="ghost" icon="refresh" onClick={() => { toast(`Reboot queued for ${sel.length} devices`); clear(); }}>Reboot</Button>
            <Button size="sm" variant="danger" onClick={() => { toast(`${sel.length} devices removed`); clear(); }}>Remove</Button>
          </>
        )} />
      <RegisterDeviceSheet open={regOpen} onClose={() => setRegOpen(false)} onRegister={registerDevice} />
    </div>
  );
}

/* ============================================================
   2 · DEVICE DETAIL
   ============================================================ */
function DeviceDetailView({ deviceId, onBack }) {
  const d = DEV.find(x => x.id === deviceId) || DEV[0];
  const [tab, setTab] = useState('Overview');
  const [period, setPeriod] = useState('24h');
  const [sshOpen, setSshOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const toast = useToast();
  const tabs = ['Overview', 'Metrics', 'Commands', 'Logs', 'Settings'];

  const cmdCols = [
    { key: 'cmd', label: 'Command', render: r => <span className="td-mono td-strong">{r.cmd}</span> },
    { key: 'by', label: 'Issued by', render: r => <span className="muted">{r.by}</span> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} icon={false} /> },
    { key: 'ts', label: 'When', render: r => <span className="td-mono dim">{r.ts}</span> },
  ];
  const [cmds, setCmds] = useState([
    { id: 1, cmd: 'systemctl restart agent', by: 'Lucía F.', status: 'RESOLVED', ts: '09:12:04' },
    { id: 2, cmd: 'apt update && upgrade', by: 'Marc O.', status: 'ACK', ts: '08:40:55' },
    { id: 3, cmd: 'reboot', by: 'system', status: 'OPEN', ts: '06:58:03' },
  ]);
  const runCommand = (cmd) => {
    setCmds(c => [{ id: Date.now(), cmd, by: 'You', status: 'RUNNING', ts: 'just now' }, ...c]);
    toast('Command queued \u00b7 ' + cmd.slice(0, 40));
  };

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn btn--subtle btn--sm" onClick={onBack}><Icon name="chevLeft" size={15} />Fleet</button>
      </div>

      <div className="devhead">
        <div className="devhead__icon"><Icon name={d.type === 'Gateway' ? 'cpu' : 'thermo'} size={25} /></div>
        <div style={{ flex: 1 }}>
          <div className="devhead__name">{d.name}<StatusBadge status={d.status} /></div>
          <div className="devhead__meta">
            <span className="devhead__meta-item"><Icon name="command" size={13} />{d.id}</span>
            <span className="devhead__meta-item"><Icon name="globe" size={13} />{d.ip}</span>
            <span className="devhead__meta-item"><Icon name="mapPin" size={13} />{d.loc}</span>
            <span className="devhead__meta-item"><Icon name="zap" size={13} />fw {d.fw}</span>
            <span className="devhead__meta-item"><Icon name="clock" size={13} />up {d.up}</span>
          </div>
        </div>
        <div className="row">
          <Button variant="ghost" icon="terminal" onClick={() => setSshOpen(true)}>SSH</Button>
          <Button variant="ghost" icon="refresh" onClick={() => toast('Telemetry refreshed')}>Refresh</Button>
          <Button variant="primary" icon="play" onClick={() => setCmdOpen(true)}>Run command</Button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t => <div key={t} className={`tab ${tab === t ? 'tab--active' : ''}`} onClick={() => setTab(t)}>{t}</div>)}
      </div>

      <div className="metrics">
        <MetricCard icon="cpu" iconColor="var(--primary)" label="CPU" value={d.cpu} unit="%" delta="nominal" deltaDir="flat" spark={SERIES.cpu} />
        <MetricCard icon="mem" iconColor="var(--info)" label="Memory" value={d.mem} unit="%" delta="+3%" deltaDir="down" spark={SERIES.mem} />
        <MetricCard icon="thermo" iconColor="var(--warning)" label="Temperature" value={d.temp} unit="°C" delta="−1°C" deltaDir="up" spark={SERIES.temp} />
        <MetricCard icon="hdd" iconColor="var(--success)" label="Disk" value={d.disk} unit="%" delta="stable" deltaDir="flat" spark={SERIES.net} />
      </div>

      <div className="grid-2">
        <div className="stack">
          <div className="card" data-kit="Card · metrics chart">
            <div className="card__head"><Icon name="activity" size={16} style={{ color: 'var(--primary)' }} /><span className="card__title">CPU & memory</span>
              <div className="chartcard__legend" style={{ marginLeft: 'auto' }}>
                <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--primary)' }} />CPU</span>
                <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--info)' }} />Mem</span>
              </div>
              <DateRangePicker value={period} onChange={setPeriod} />
            </div>
            <div className="card__body" style={{ paddingTop: 10 }}>
              <Chart data={SERIES.cpu} height={180} unit="%" yMax={100} />
            </div>
          </div>

          <div className="card" data-kit="DataTable · commands">
            <div className="card__head"><Icon name="terminal" size={16} /><span className="card__title">Recent commands</span><Button size="sm" variant="subtle" icon="plus" onClick={() => setCmdOpen(true)}>New</Button></div>
            <DataTable columns={cmdCols} rows={cmds} pageSize={3} kitName="DataTable · commands" />
          </div>
        </div>

        <div className="card" data-kit="Card · device info">
          <div className="card__head"><Icon name="info" size={16} /><span className="card__title">Device info</span></div>
          <div className="card__body">
            <div className="kv">
              <div className="kv__k">Public ID</div><div className="kv__v mono">{d.id}</div>
              <div className="kv__k">Hardware</div><div className="kv__v">{d.hw}</div>
              <div className="kv__k">Type</div><div className="kv__v">{d.type}</div>
              <div className="kv__k">IP address</div><div className="kv__v mono">{d.ip}</div>
              <div className="kv__k">Firmware</div><div className="kv__v mono">{d.fw}</div>
              <div className="kv__k">Location</div><div className="kv__v">{d.loc}</div>
              <div className="kv__k">Uptime</div><div className="kv__v mono">{d.up}</div>
              <div className="kv__k">Last seen</div><div className="kv__v mono">{d.last} ago</div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', margin: '16px -16px 0', padding: '16px 16px 0' }}>
              <div className="label" style={{ marginBottom: 10 }}>Owner</div>
              <div className="row"><UserAvatar user={USR[0]} size={30} /><div><div style={{ fontSize: 13, fontWeight: 550 }}>{USR[0].name}</div><div className="td-mono dim" style={{ fontSize: 11 }}>{USR[0].email}</div></div></div>
            </div>
          </div>
        </div>
      </div>

      <SSHTerminal open={sshOpen} onClose={() => setSshOpen(false)} device={d} />
      <CommandSheet open={cmdOpen} onClose={() => setCmdOpen(false)} device={d} onRun={runCommand} />
    </div>
  );
}

/* ============================================================
   3 · MONITORING / ALERTS
   ============================================================ */
function MonitoringView({ onOpenDevice }) {
  const [devFilter, setDevFilter] = useState([]);
  const [sevFilter, setSevFilter] = useState([]);
  const [stateFilter, setStateFilter] = useState([]);
  const [period, setPeriod] = useState('24h');
  const toast = useToast();

  let rows = ALERTS;
  if (devFilter.length) rows = rows.filter(a => devFilter.includes(a.devId));
  if (sevFilter.length) rows = rows.filter(a => sevFilter.includes(a.sev));
  if (stateFilter.length) rows = rows.filter(a => stateFilter.includes(a.state));

  const cols = [
    { key: 'sev', label: 'Severity', sortable: true, sortVal: r => ({ critical: 0, warning: 1, info: 2 }[r.sev]), render: r => (
      <div className="sev-cell"><span className={`sev-bar sev-bar--${r.sev}`} /><SeverityBadge sev={r.sev} /></div>) },
    { key: 'title', label: 'Alert', render: r => (
      <div><div className="td-strong">{r.title}</div><div className="td-mono dim" style={{ fontSize: 11 }}>{r.metric} · {r.value} (limit {r.threshold})</div></div>) },
    { key: 'device', label: 'Device', render: r => (
      <span className="cell" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onOpenDevice(r.devId); }}>
        <StatusDot status="ONLINE" /><span className="td-mono" style={{ fontSize: 12 }}>{r.device}</span></span>) },
    { key: 'state', label: 'State', sortable: true, render: r => <StatusBadge status={r.state} icon={false} /> },
    { key: 'ts', label: 'Triggered', sortable: true, render: r => <span className="td-mono dim">{r.age} ago</span> },
  ];

  return (
    <div className="page page--wide">
      <div className="pagehead">
        <div><div className="pagehead__title">Monitoring</div><div className="pagehead__sub">{ALERTS.filter(a => a.state === 'OPEN').length} open alerts · tenant-wide</div></div>
        <div className="pagehead__actions">
          <Button variant="ghost" icon="settings">Thresholds</Button>
          <Button variant="ghost" icon="download">Report</Button>
        </div>
      </div>

      <div className="filterbar" data-kit="FilterBar (composed pickers)">
        <DevicePicker value={devFilter} onChange={setDevFilter} />
        <MultiSelectPicker value={sevFilter} onChange={setSevFilter} label="Severity" icon="alert"
          title="Filter by severity" sub="Show only these severities"
          options={[{ value: 'critical', badge: true }, { value: 'warning', badge: true }, { value: 'info', badge: true }]} />
        <MultiSelectPicker value={stateFilter} onChange={setStateFilter} label="State" icon="filter"
          title="Filter by state" sub="Alert lifecycle state"
          options={[{ value: 'OPEN', label: 'Open', dot: 'error' }, { value: 'ACK', label: 'Acknowledged', dot: 'maintenance' }, { value: 'RESOLVED', label: 'Resolved', dot: 'completed' }]} />
        <DateRangePicker value={period} onChange={setPeriod} />
        <div className="filterbar__spacer" />
        <span className="label">{rows.length} of {ALERTS.length}</span>
      </div>

      <DataTable columns={cols} rows={rows} pageSize={7} selectable kitName="DataTable · alerts"
        renderActions={(sel, clear) => (
          <>
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="ghost" icon="check" onClick={() => { toast(`${sel.length} alerts acknowledged`); clear(); }}>Acknowledge</Button>
            <Button size="sm" variant="ghost" icon="user">Assign</Button>
            <Button size="sm" variant="danger" onClick={() => { toast(`${sel.length} alerts resolved`); clear(); }}>Resolve</Button>
          </>
        )} />
    </div>
  );
}

/* ============================================================
   4 · ADMIN · USERS
   ============================================================ */
function AdminView() {
  const [roleFilter, setRoleFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const toast = useToast();

  let rows = USR;
  if (roleFilter.length) rows = rows.filter(u => roleFilter.includes(u.role));
  if (statusFilter.length) rows = rows.filter(u => statusFilter.includes(u.status));

  const cols = [
    { key: 'name', label: 'User', sortable: true, render: r => (
      <div className="cell"><UserAvatar user={r} size={30} /><div><div className="td-strong">{r.name}</div><div className="td-mono dim" style={{ fontSize: 11 }}>{r.email}</div></div></div>) },
    { key: 'role', label: 'Role', sortable: true, render: r => <RoleBadge role={r.role} /> },
    { key: 'status', label: 'Status', sortable: true, render: r => <StatusBadge status={r.status} /> },
    { key: 'last', label: 'Last active', render: r => <span className="td-mono dim">{r.last === '—' ? '—' : r.last + ' ago'}</span> },
    { key: 'act', label: '', width: 120, render: r => r.status === 'PENDING'
      ? <div className="cell cell--end"><Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); toast(`${r.name} approved`); }}>Approve</Button></div>
      : <div className="cell cell--end"><button className="iconbtn" style={{ width: 28, height: 28 }}><Icon name="more" size={16} /></button></div> },
  ];

  return (
    <div className="page page--wide">
      <div className="pagehead">
        <div><div className="pagehead__title">Users</div><div className="pagehead__sub">{USR.length} members · {USR.filter(u => u.status === 'PENDING').length} pending approval</div></div>
        <div className="pagehead__actions">
          <Button variant="ghost" icon="download">Export</Button>
          <Button variant="primary" icon="plus">Invite user</Button>
        </div>
      </div>

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <MetricCard icon="users" iconColor="var(--primary)" label="Total users" value={USR.length} />
        <MetricCard icon="check" iconColor="var(--success)" label="Active" value={USR.filter(u => u.status === 'ACTIVE').length} />
        <MetricCard icon="clock" iconColor="var(--warning)" label="Pending" value={USR.filter(u => u.status === 'PENDING').length} />
        <MetricCard icon="shield" iconColor="var(--info)" label="Admins" value={USR.filter(u => u.role === 'ADMIN').length} />
      </div>

      <div className="filterbar" data-kit="FilterBar (same pickers, reused)">
        <UserPicker value={[]} onChange={() => {}} label="Find user" multi={false} />
        <MultiSelectPicker value={roleFilter} onChange={setRoleFilter} label="Role" icon="shield"
          title="Filter by role" sub="Access level"
          options={[{ value: 'ADMIN', label: 'Admin' }, { value: 'OPERATOR', label: 'Operator' }, { value: 'VIEWER', label: 'Viewer' }]} />
        <MultiSelectPicker value={statusFilter} onChange={setStatusFilter} label="Status" icon="filter"
          title="Filter by status" sub="Account state"
          options={[{ value: 'ACTIVE', label: 'Active', dot: 'online' }, { value: 'PENDING', label: 'Pending', dot: 'maintenance' }, { value: 'SUSPENDED', label: 'Suspended', dot: 'unclaimed' }]} />
        <div className="filterbar__spacer" />
        <span className="label">{rows.length} of {USR.length}</span>
      </div>

      <DataTable columns={cols} rows={rows} pageSize={7} selectable kitName="DataTable · users"
        renderActions={(sel, clear) => (
          <><div style={{ flex: 1 }} />
            <Button size="sm" variant="ghost" icon="check" onClick={() => { toast(`${sel.length} users approved`); clear(); }}>Approve</Button>
            <Button size="sm" variant="ghost" icon="shield">Change role</Button>
            <Button size="sm" variant="danger" onClick={() => { toast(`${sel.length} users suspended`); clear(); }}>Suspend</Button>
          </>
        )} />
    </div>
  );
}

/* ============================================================
   5 · LOGS
   ============================================================ */
function LogsView() {
  const [devFilter, setDevFilter] = useState([]);
  const [lvlFilter, setLvlFilter] = useState([]);
  const [period, setPeriod] = useState('1h');
  const [q, setQ] = useState('');

  let rows = LOGS;
  if (devFilter.length) rows = rows.filter(l => devFilter.includes((DEV.find(d => d.name === l.dev) || {}).id));
  if (lvlFilter.length) rows = rows.filter(l => lvlFilter.includes(l.lvl));
  if (q) rows = rows.filter(l => (l.msg + l.dev).toLowerCase().includes(q.toLowerCase()));

  const hl = (msg) => {
    const parts = msg.split(/(\b\w+=[^\s]+|\b\d+%|\b\d+°C)/g);
    return parts.map((p, i) => /=|%|°C/.test(p) ? <b key={i}>{p}</b> : p);
  };

  return (
    <div className="page page--wide">
      <div className="pagehead">
        <div><div className="pagehead__title">Logs</div><div className="pagehead__sub">Streaming · tenant-wide · {rows.length} lines</div></div>
        <div className="pagehead__actions">
          <Button variant="ghost" icon="download">Download</Button>
          <Button variant="ghost" icon="refresh">Live</Button>
        </div>
      </div>

      <div className="filterbar">
        <div className="field" style={{ width: 260 }}><Icon name="search" size={15} /><input placeholder="Filter messages…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <DevicePicker value={devFilter} onChange={setDevFilter} />
        <MultiSelectPicker value={lvlFilter} onChange={setLvlFilter} label="Level" icon="filter"
          title="Filter by log level" sub="Severity of log lines"
          options={[{ value: 'error', label: 'Error', dot: 'error' }, { value: 'warn', label: 'Warning', dot: 'maintenance' }, { value: 'info', label: 'Info', dot: 'running' }, { value: 'debug', label: 'Debug', dot: 'unclaimed' }]} />
        <DateRangePicker value={period} onChange={setPeriod} />
        <div className="filterbar__spacer" />
        <span className="label">tail -f</span>
      </div>

      <div className="logstream" data-kit="LogStream">
        {rows.length === 0 ? <EmptyState icon="logs" title="No matching log lines" sub="Adjust filters or time range" /> :
          rows.map((l, i) => (
            <div key={i} className="logrow">
              <span className="logrow__ts">{l.ts}</span>
              <span className={`logrow__lvl lvl--${l.lvl}`}>{l.lvl}</span>
              <span className="logrow__msg"><span className="dim">[{l.dev}]</span> {hl(l.msg)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

Object.assign(window, { DashboardView, DevicesListView, DeviceDetailView, MonitoringView, AdminView, LogsView });
