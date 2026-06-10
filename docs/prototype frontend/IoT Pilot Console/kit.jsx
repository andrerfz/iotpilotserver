/* ============================================================
   IoT Pilot Console — Shared component kit ("the Lego box")
   Every view composes from these. Exposed on window.
   ============================================================ */
const { useState, useEffect, useMemo, useRef } = React;
const { I, DEVICES, USERS } = window.IOT;

/* ---------------- Icon ---------------- */
function Icon({ name, size = 18, sw = 1.75, style, className }) {
  const d = I[name] || '';
  const parts = d.split('|');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} aria-hidden="true">
      {parts.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

/* ---------------- Button ---------------- */
function Button({ variant = 'ghost', size, icon, iconRight, children, ...rest }) {
  const cls = ['btn', `btn--${variant}`, size ? `btn--${size}` : ''].join(' ');
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 15} />}
      {children}
      {iconRight && <Icon name={iconRight} size={15} />}
    </button>
  );
}

/* ---------------- Status primitives ---------------- */
const STATUS_META = {
  ONLINE:        { c: 'success', icon: 'wifi', label: 'Online' },
  OFFLINE:       { c: 'danger',  icon: 'wifiOff', label: 'Offline' },
  MAINTENANCE:   { c: 'warning', icon: 'settings', label: 'Maintenance' },
  ERROR:         { c: 'danger',  icon: 'alert', label: 'Error' },
  PENDING_SETUP: { c: 'warning', icon: 'clock', label: 'Pending setup' },
  UNCLAIMED:     { c: 'neutral', icon: 'wifiOff', label: 'Unclaimed' },
  ACTIVE:        { c: 'success', icon: 'check', label: 'Active' },
  PENDING:       { c: 'warning', icon: 'clock', label: 'Pending' },
  SUSPENDED:     { c: 'neutral', icon: 'power', label: 'Suspended' },
  OPEN:          { c: 'danger',  icon: 'alert', label: 'Open' },
  ACK:           { c: 'warning', icon: 'clock', label: 'Acknowledged' },
  RESOLVED:      { c: 'success', icon: 'check', label: 'Resolved' },
};
function StatusDot({ status, live }) {
  return <span className={`dot dot--${status.toLowerCase()} ${live && status === 'ONLINE' ? 'dot--live' : ''}`} />;
}
function StatusBadge({ status, icon = true }) {
  const m = STATUS_META[status] || { c: 'neutral', icon: 'info', label: status };
  return (
    <span className={`badge badge--${m.c}`} data-kit="StatusBadge">
      {icon && <Icon name={m.icon} size={12} />}{m.label}
    </span>
  );
}
const SEV_META = { critical: { c: 'danger', label: 'Critical' }, warning: { c: 'warning', label: 'Warning' }, info: { c: 'info', label: 'Info' } };
function SeverityBadge({ sev }) {
  const m = SEV_META[sev];
  return <span className={`badge badge--${m.c}`} data-kit="SeverityBadge"><Icon name="alert" size={12} />{m.label}</span>;
}
function RoleBadge({ role }) {
  const map = { ADMIN: 'primary', OPERATOR: 'info', VIEWER: 'neutral', SUPERADMIN: 'warning' };
  return <span className={`badge badge--${map[role] || 'neutral'}`}>{role}</span>;
}

/* ---------------- Checkbox ---------------- */
function Checkbox({ checked, onChange }) {
  return (
    <span className={`checkbox ${checked ? 'checkbox--on' : ''}`} onClick={(e) => { e.stopPropagation(); onChange && onChange(!checked); }}>
      <Icon name="check" size={12} sw={3} />
    </span>
  );
}

/* ---------------- Avatar ---------------- */
function UserAvatar({ user, size = 26 }) {
  const initials = user.name.split(' ').map(s => s[0]).slice(0, 2).join('');
  return (
    <span className="av-sm" style={{
      width: size, height: size,
      background: `hsl(${user.hue} 55% 50% / 0.18)`, color: `hsl(${user.hue} 65% 62%)`,
      border: `1px solid hsl(${user.hue} 55% 50% / 0.3)`,
    }}>{initials}</span>
  );
}

/* ---------------- Sparkline + Chart ---------------- */
function Sparkline({ data, color = 'var(--primary)', w = 240, h = 38 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / rng) * (h - 6) - 3]);
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const gid = 'sg' + useMemo(() => Math.random().toString(36).slice(2, 7), []);
  return (
    <svg className="metric__spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.22" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function Chart({ data, height = 200, color = 'var(--primary)', unit = '', yMax }) {
  const w = 720, h = height, padL = 38, padB = 22, padT = 10, padR = 8;
  const iw = w - padL - padR, ih = h - padT - padB;
  const max = yMax || Math.ceil(Math.max(...data) / 10) * 10;
  const min = 0, rng = max - min || 1;
  const x = i => padL + (i / (data.length - 1)) * iw;
  const y = v => padT + ih - ((v - min) / rng) * ih;
  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `${padL},${padT + ih} ${line} ${padL + iw},${padT + ih}`;
  const gid = 'cg' + useMemo(() => Math.random().toString(36).slice(2, 7), []);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(min + t * rng));
  const last = data[data.length - 1];
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ height }} data-kit="Chart">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.20" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <g className="chart-grid">
        {ticks.map((t, i) => {
          const yy = y(t);
          return <g key={i}>
            <line x1={padL} y1={yy} x2={padL + iw} y2={yy} />
            <text className="chart-axis" x={padL - 8} y={yy + 3} textAnchor="end">{t}{unit}</text>
          </g>;
        })}
      </g>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" />
      <circle cx={x(data.length - 1)} cy={y(last)} r="3.5" fill={color} stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

/* ---------------- MetricCard ---------------- */
function MetricCard({ icon, iconColor = 'var(--primary)', label, value, unit, delta, deltaDir = 'flat', spark }) {
  return (
    <div className="metric" data-kit="MetricCard">
      <div className="metric__top">
        <span className="metric__icon" style={{ background: `color-mix(in srgb, ${iconColor} 15%, transparent)`, color: iconColor }}>
          <Icon name={icon} size={15} />
        </span>
        <span className="metric__label">{label}</span>
      </div>
      <div className="metric__val">{value}{unit && <span className="metric__unit">{unit}</span>}</div>
      {delta != null && (
        <div className={`metric__delta delta--${deltaDir}`}>
          {deltaDir !== 'flat' && <Icon name={deltaDir === 'up' ? 'arrowUp' : 'arrowDown'} size={12} />}
          {delta}
        </div>
      )}
      {spark && <Sparkline data={spark} color={iconColor} />}
    </div>
  );
}

/* ---------------- DataTable ---------------- */
function DataTable({ columns, rows, rowKey = 'id', selectable, onRowClick, pageSize = 6, kitName = 'DataTable', renderActions }) {
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState([]);
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const col = columns.find(c => c.key === sort.key);
    const get = col && col.sortVal ? col.sortVal : r => r[sort.key];
    return [...rows].sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av < bv) return -1 * sort.dir; if (av > bv) return 1 * sort.dir; return 0;
    });
  }, [rows, sort, columns]);
  const pages = Math.ceil(sorted.length / pageSize);
  const view = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const allOnPage = view.every(r => sel.includes(r[rowKey])) && view.length > 0;
  const toggleAll = () => setSel(allOnPage ? sel.filter(id => !view.some(r => r[rowKey] === id)) : [...new Set([...sel, ...view.map(r => r[rowKey])])]);
  const toggle = id => setSel(sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id]);
  const doSort = key => setSort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: 1 });

  return (
    <div className="tablewrap" data-kit={kitName}>
      {selectable && sel.length > 0 && (
        <div className="selbar">
          <span className="selbar__count">{sel.length}</span>
          <span className="muted">selected</span>
          {renderActions ? renderActions(sel, () => setSel([])) : (
            <>
              <div style={{ flex: 1 }} />
              <Button size="sm" variant="ghost" icon="check">Acknowledge</Button>
              <Button size="sm" variant="subtle" onClick={() => setSel([])}>Clear</Button>
            </>
          )}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              {selectable && <th className="checkcell"><Checkbox checked={allOnPage} onChange={toggleAll} /></th>}
              {columns.map(c => (
                <th key={c.key} className={c.sortable ? 'sortable' : ''} style={c.width ? { width: c.width } : null}
                  onClick={c.sortable ? () => doSort(c.key) : undefined}>
                  <span className="th-sort">{c.label}{c.sortable && sort.key === c.key && <Icon name={sort.dir === 1 ? 'arrowUp' : 'arrowDown'} size={12} />}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map(r => (
              <tr key={r[rowKey]} className={onRowClick ? 'row--clickable' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {selectable && <td className="checkcell"><Checkbox checked={sel.includes(r[rowKey])} onChange={() => toggle(r[rowKey])} /></td>}
                {columns.map(c => <td key={c.key} style={c.tdStyle}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table__foot">
        <span>{sorted.length} rows{selectable && sel.length ? ` · ${sel.length} selected` : ''}</span>
        <div className="pager">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}><Icon name="chevLeft" size={14} /></button>
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} className={i === page ? 'is-active' : ''} onClick={() => setPage(i)}>{i + 1}</button>
          ))}
          <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}><Icon name="chevRight" size={14} /></button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BOTTOM SHEET  — the signature selector shell
   Cancel (left)  /  Save (right)
   ============================================================ */
function BottomSheet({ open, onClose, onSave, title, sub, children, saveLabel = 'Apply', saveDisabled, count }) {
  useEffect(() => {
    const onEsc = e => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);
  return (
    <>
      <div className={`scrim ${open ? 'scrim--open' : ''}`} onClick={onClose} />
      <div className={`sheet ${open ? 'sheet--open' : ''}`} role="dialog" aria-modal="true">
        <div className="sheet__panel" data-kit="BottomSheet">
          <div className="sheet__grab" />
          <div className="sheet__head">
            <div>
              <div className="sheet__title">{title}</div>
              {sub && <div className="sheet__sub">{sub}</div>}
            </div>
            {count != null && <span className="label">{count} selected</span>}
          </div>
          <div className="sheet__body">{children}</div>
          <div className="sheet__foot sheet__foot--split">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={onSave} disabled={saveDisabled}>{saveLabel}</Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* Generic trigger chip used by every picker */
function FilterChip({ icon, label, value, active, count, onClick, onClear }) {
  return (
    <button className={`chip ${active ? 'chip--active' : ''}`} onClick={onClick} data-kit="FilterChip">
      {icon && <Icon name={icon} size={14} />}
      <span className="chip__key">{label}</span>
      {value && <span className="chip__val">{value}</span>}
      {count > 0 && <span className="chip__count">{count}</span>}
      {active && onClear && <span className="chip__x" onClick={(e) => { e.stopPropagation(); onClear(); }}><Icon name="x" size={13} /></span>}
      {!active && <Icon name="chevDown" size={13} />}
    </button>
  );
}

/* ---------------- DevicePicker ---------------- */
function DevicePicker({ value = [], onChange, multi = true, label = 'Device' }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setDraft(value); }, [open]);
  const list = DEVICES.filter(d => (d.name + d.id + d.loc).toLowerCase().includes(q.toLowerCase()));
  const toggle = id => multi
    ? setDraft(draft.includes(id) ? draft.filter(x => x !== id) : [...draft, id])
    : setDraft([id]);
  const summary = value.length === 0 ? null : value.length === 1
    ? (DEVICES.find(d => d.id === value[0]) || {}).name : `${value.length} devices`;
  return (
    <>
      <FilterChip icon="devices" label={label} value={summary} active={value.length > 0}
        count={multi ? value.length : 0} onClick={() => setOpen(true)} onClear={() => onChange([])} />
      <BottomSheet open={open} onClose={() => setOpen(false)} onSave={() => { onChange(draft); setOpen(false); }}
        title="Select device" sub={multi ? 'Choose one or more devices' : 'Choose a device'}
        count={multi ? draft.length : null} saveLabel="Apply">
        <div className="field"><Icon name="search" size={15} /><input autoFocus placeholder="Search by name, ID or location…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="optlist">
          {list.map(d => {
            const sel = draft.includes(d.id);
            return (
              <div key={d.id} className={`opt ${sel ? 'opt--sel' : ''}`} onClick={() => toggle(d.id)}>
                <StatusDot status={d.status} />
                <div className="opt__main">
                  <div className="opt__title">{d.name}</div>
                  <div className="opt__meta">{d.id} · {d.loc}</div>
                </div>
                <div className={multi ? 'opt__check' : 'opt__radio'}>{multi && <Icon name="check" size={12} sw={3} />}</div>
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}

/* ---------------- UserPicker ---------------- */
function UserPicker({ value = [], onChange, multi = true, label = 'Assignee' }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setDraft(value); }, [open]);
  const list = USERS.filter(u => (u.name + u.email + u.role).toLowerCase().includes(q.toLowerCase()));
  const toggle = id => multi
    ? setDraft(draft.includes(id) ? draft.filter(x => x !== id) : [...draft, id])
    : setDraft([id]);
  const summary = value.length === 0 ? null : value.length === 1
    ? (USERS.find(u => u.id === value[0]) || {}).name : `${value.length} users`;
  return (
    <>
      <FilterChip icon="user" label={label} value={summary} active={value.length > 0}
        count={multi ? value.length : 0} onClick={() => setOpen(true)} onClear={() => onChange([])} />
      <BottomSheet open={open} onClose={() => setOpen(false)} onSave={() => { onChange(draft); setOpen(false); }}
        title="Select user" sub={multi ? 'Assign one or more users' : 'Choose a user'}
        count={multi ? draft.length : null} saveLabel="Apply">
        <div className="field"><Icon name="search" size={15} /><input autoFocus placeholder="Search people…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="optlist">
          {list.map(u => {
            const sel = draft.includes(u.id);
            return (
              <div key={u.id} className={`opt ${sel ? 'opt--sel' : ''}`} onClick={() => toggle(u.id)}>
                <UserAvatar user={u} />
                <div className="opt__main">
                  <div className="opt__title">{u.name} <RoleBadge role={u.role} /></div>
                  <div className="opt__meta">{u.email}</div>
                </div>
                <div className={multi ? 'opt__check' : 'opt__radio'}>{multi && <Icon name="check" size={12} sw={3} />}</div>
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}

/* ---------------- MultiSelect (status / severity / level) ---------------- */
function MultiSelectPicker({ value = [], onChange, options, label, icon, title, sub }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open]);
  const toggle = v => setDraft(draft.includes(v) ? draft.filter(x => x !== v) : [...draft, v]);
  const summary = value.length === 0 ? null : value.length === 1
    ? (options.find(o => o.value === value[0]) || {}).label : `${value.length} selected`;
  return (
    <>
      <FilterChip icon={icon} label={label} value={summary} active={value.length > 0}
        count={value.length} onClick={() => setOpen(true)} onClear={() => onChange([])} />
      <BottomSheet open={open} onClose={() => setOpen(false)} onSave={() => { onChange(draft); setOpen(false); }}
        title={title} sub={sub} count={draft.length} saveLabel="Apply">
        <div className="optlist">
          {options.map(o => {
            const sel = draft.includes(o.value);
            return (
              <div key={o.value} className={`opt ${sel ? 'opt--sel' : ''}`} onClick={() => toggle(o.value)}>
                {o.dot && <span className={`dot dot--${o.dot}`} />}
                {o.badge && <SeverityBadge sev={o.value} />}
                <div className="opt__main"><div className="opt__title">{!o.badge && o.label}</div></div>
                <div className="opt__check">{<Icon name="check" size={12} sw={3} />}</div>
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}

/* ---------------- DateRangePicker ---------------- */
const PRESETS = [
  { id: '1h', t: 'Last hour', d: 'now − 60m' },
  { id: '24h', t: 'Last 24 hours', d: 'now − 24h' },
  { id: '7d', t: 'Last 7 days', d: 'now − 7d' },
  { id: '30d', t: 'Last 30 days', d: 'now − 30d' },
];
function MiniCalendar() {
  const dow = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const days = []; // June 2026 starts on Monday
  for (let i = 1; i <= 30; i++) days.push(i);
  return (
    <div className="cal">
      <div className="cal__head">
        <button className="iconbtn" style={{ width: 28, height: 28 }}><Icon name="chevLeft" size={14} /></button>
        <span className="cal__month">June 2026</span>
        <button className="iconbtn" style={{ width: 28, height: 28 }}><Icon name="chevRight" size={14} /></button>
      </div>
      <div className="cal__grid">
        {dow.map(d => <div key={d} className="cal__dow">{d}</div>)}
        {days.map(d => {
          const inRange = d >= 4 && d <= 10;
          const isEnd = d === 4 || d === 10;
          return <div key={d} className={`cal__day ${inRange && !isEnd ? 'cal__day--range' : ''} ${isEnd ? 'cal__day--end' : ''}`}>{d}</div>;
        })}
      </div>
    </div>
  );
}
function DateRangePicker({ value = '24h', onChange, label = 'Period' }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open]);
  const summary = (PRESETS.find(p => p.id === value) || {}).t || 'Custom';
  return (
    <>
      <FilterChip icon="calendar" label={label} value={summary} active onClick={() => setOpen(true)} />
      <BottomSheet open={open} onClose={() => setOpen(false)} onSave={() => { onChange(draft); setOpen(false); }}
        title="Select time range" sub="Quick preset or custom range" saveLabel="Apply">
        <div className="presets">
          {PRESETS.map(p => (
            <button key={p.id} className={`preset ${draft === p.id ? 'preset--sel' : ''}`} onClick={() => setDraft(p.id)}>
              <div className="preset__t">{p.t}</div>
              <div className="preset__d">{p.d}</div>
            </button>
          ))}
        </div>
        <div className="label" style={{ marginTop: 18, marginBottom: 2 }}>Custom range</div>
        <MiniCalendar />
      </BottomSheet>
    </>
  );
}

/* ---------------- EmptyState ---------------- */
function EmptyState({ icon = 'info', title, sub }) {
  return <div className="empty"><Icon name={icon} size={30} /><div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{title}</div>{sub && <div style={{ fontSize: 12.5 }}>{sub}</div>}</div>;
}

/* ---------------- Toast ---------------- */
function useToast() {
  return (msg) => window.dispatchEvent(new CustomEvent('toast', { detail: msg }));
}
function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const h = e => {
      const id = Math.random();
      setToasts(t => [...t, { id, msg: e.detail }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
    };
    window.addEventListener('toast', h);
    return () => window.removeEventListener('toast', h);
  }, []);
  return <div className="toast-host">{toasts.map(t => <div key={t.id} className="toast"><Icon name="check" size={16} />{t.msg}</div>)}</div>;
}

/* ---------------- Command palette ---------------- */
function CommandPalette({ open, onClose, onNav }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const items = [
    { g: 'Navigate', icon: 'dashboard', label: 'Dashboard', kbd: 'G D', act: () => onNav('dashboard') },
    { g: 'Navigate', icon: 'devices', label: 'Devices', kbd: 'G V', act: () => onNav('device') },
    { g: 'Navigate', icon: 'bell', label: 'Monitoring · Alerts', kbd: 'G A', act: () => onNav('monitoring') },
    { g: 'Navigate', icon: 'shield', label: 'Admin · Users', kbd: 'G U', act: () => onNav('admin') },
    { g: 'Navigate', icon: 'logs', label: 'Logs', kbd: 'G L', act: () => onNav('logs') },
    { g: 'Actions', icon: 'plus', label: 'Register a device', act: () => onNav('device') },
    { g: 'Actions', icon: 'refresh', label: 'Refresh telemetry', act: () => onClose() },
  ];
  const filtered = items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()));
  useEffect(() => { setActive(0); }, [q, open]);
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      if (e.key === 'Enter' && filtered[active]) { filtered[active].act(); onClose(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, filtered, active]);
  if (!open) return null;
  let lastG = null;
  return (
    <>
      <div className="scrim scrim--open" onClick={onClose} style={{ zIndex: 79 }} />
      <div className="palette-wrap" onClick={onClose}>
        <div className="palette" onClick={e => e.stopPropagation()}>
          <div className="palette__input"><Icon name="search" size={18} /><input autoFocus placeholder="Search or jump to…" value={q} onChange={e => setQ(e.target.value)} /><kbd className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>ESC</kbd></div>
          <div className="palette__results">
            {filtered.map((it, i) => {
              const head = it.g !== lastG ? <div className="palette__group" key={'g' + i}>{it.g}</div> : null;
              lastG = it.g;
              return (
                <React.Fragment key={i}>
                  {head}
                  <div className={`palette__item ${i === active ? 'palette__item--active' : ''}`}
                    onMouseEnter={() => setActive(i)} onClick={() => { it.act(); onClose(); }}>
                    <Icon name={it.icon} size={16} />{it.label}{it.kbd && <span className="mono">{it.kbd}</span>}
                  </div>
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && <div className="palette__group">No results</div>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- CommandSheet (preset commands) ---------------- */
const CMD_PRESETS = [
  { label: 'Restart agent', cmd: 'systemctl restart iot-agent', icon: 'refresh' },
  { label: 'Reboot device', cmd: 'sudo reboot', icon: 'power', danger: true },
  { label: 'Update packages', cmd: 'apt update && apt upgrade -y', icon: 'download' },
  { label: 'Pull latest firmware', cmd: 'iotctl firmware pull --latest', icon: 'zap' },
  { label: 'Run diagnostics', cmd: 'iotctl diag --full', icon: 'activity' },
  { label: 'Sync clock', cmd: 'chronyc makestep', icon: 'clock' },
  { label: 'Tail agent logs', cmd: 'journalctl -u iot-agent -n 100 -f', icon: 'logs' },
];
function CommandSheet({ open, onClose, device, onRun }) {
  const [cmd, setCmd] = useState('');
  const [picked, setPicked] = useState(null);
  useEffect(() => { if (open) { setCmd(''); setPicked(null); } }, [open]);
  const pick = p => { setPicked(p.cmd); setCmd(p.cmd); };
  return (
    <BottomSheet open={open} onClose={onClose}
      onSave={() => { if (cmd.trim()) { onRun(cmd.trim(), CMD_PRESETS.find(p => p.cmd === picked)); onClose(); } }}
      title="Run command" sub={`Execute on ${device.name}`} saveLabel="Run command" saveDisabled={!cmd.trim()}>
      <div className="label" style={{ marginBottom: 8 }}>Preset commands</div>
      <div className="optlist" data-kit="preset list">
        {CMD_PRESETS.map(p => {
          const sel = picked === p.cmd;
          return (
            <div key={p.cmd} className={`opt ${sel ? 'opt--sel' : ''}`} onClick={() => pick(p)}>
              <span className="metric__icon" style={{ width: 28, height: 28, background: p.danger ? 'var(--danger-weak)' : 'var(--surface-3)', color: p.danger ? 'var(--danger)' : 'var(--text-muted)' }}><Icon name={p.icon} size={15} /></span>
              <div className="opt__main">
                <div className="opt__title">{p.label}{p.danger && <span className="badge badge--danger" style={{ height: 18 }}>destructive</span>}</div>
                <div className="opt__meta">{p.cmd}</div>
              </div>
              <div className="opt__radio" />
            </div>
          );
        })}
      </div>
      <div className="label" style={{ margin: '18px 0 8px' }}>Custom command</div>
      <div className="field"><Icon name="terminal" size={15} /><input placeholder="Type a shell command…" value={cmd} onChange={e => { setCmd(e.target.value); setPicked(null); }} /></div>
      <div className="dim" style={{ fontSize: 11.5, marginTop: 8, fontFamily: 'var(--font-mono)' }}>Runs over the encrypted device tunnel · audit-logged</div>
    </BottomSheet>
  );
}

/* ---------------- SSHTerminal (interactive modal) ---------------- */
function SSHTerminal({ open, onClose, device }) {
  const host = `root@${device.name}`;
  const banner = [
    { c: 'mut', v: `Connected to ${device.name} (${device.ip}) via Tailscale · ${device.hw}` },
    { c: 'mut', v: `Last login: Tue Jun 10 09:41:55 2026 from 100.64.0.2` },
    { c: 'mut', v: `Type "help" for available commands.` },
    { c: 'sp', v: '' },
  ];
  const [lines, setLines] = useState(banner);
  const [input, setInput] = useState('');
  const [hist, setHist] = useState([]);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (open) { setLines(banner); setInput(''); setHist([]); setTimeout(() => inputRef.current && inputRef.current.focus(), 120); } }, [open]);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [lines]);

  const respond = (cmd) => {
    const c = cmd.trim();
    if (!c) return [];
    const map = {
      help: [
        { c: 'mut', v: 'Available: ls · uptime · top · whoami · df -h · systemctl status iot-agent · ip a · cat /etc/os-release · clear · exit' },
      ],
      ls: [{ v: 'agent.toml   certs/   firmware/   logs/   telemetry.db' }],
      'ls -la': [{ v: 'drwxr-xr-x  6 root root 4096 Jun 10 09:12 .\ndrwxr-xr-x 18 root root 4096 May 02 14:03 ..\n-rw-r--r--  1 root root  812 Jun 09 18:40 agent.toml\ndrwx------  2 root root 4096 May 02 14:03 certs' }],
      whoami: [{ v: 'root' }],
      uptime: [{ v: ` 09:47:55 up ${device.up.replace('d', ' days,').replace('h', ' h')},  1 user,  load average: 0.34, 0.41, 0.38` }],
      'df -h': [{ v: 'Filesystem      Size  Used Avail Use%\n/dev/mmcblk0p2   15G  ' + (device.disk ? (device.disk / 100 * 15).toFixed(1) : '7.8') + 'G  6.4G  ' + (device.disk || 52) + '%  /' }],
      top: [{ v: `Tasks: 92 total, 1 running\n%Cpu(s): ${device.cpu}.0 us,  2.1 sy\nMiB Mem : 1024 total, ${Math.round(device.mem / 100 * 1024)} used\nPID USER  %CPU %MEM COMMAND\n  812 root  ${device.cpu}.0  ${device.mem}.0 iot-agent` }],
      'ip a': [{ v: '1: lo: <LOOPBACK,UP> inet 127.0.0.1/8\n2: eth0: <BROADCAST,UP> inet ' + device.ip + '/24\n3: tailscale0: <POINTOPOINT,UP> inet 100.64.0.7/32' }],
      'systemctl status iot-agent': [
        { c: 'ok', v: '● iot-agent.service — IoT Pilot device agent' },
        { v: '   Loaded: loaded (/etc/systemd/system/iot-agent.service; enabled)' },
        { c: 'ok', v: '   Active: active (running) since Tue 2026-06-10 09:12:04; 35min ago' },
        { v: '   Main PID: 812 (iot-agent)' },
      ],
      'cat /etc/os-release': [{ v: 'PRETTY_NAME="IoT Pilot OS 2.4.1 (bookworm)"\nID=iotpilot\nVERSION_ID="2.4.1"' }],
    };
    if (c === 'clear') { setLines(banner); return null; }
    if (c === 'exit' || c === 'logout') { setTimeout(onClose, 150); return [{ c: 'mut', v: 'Connection to ' + device.name + ' closed.' }]; }
    if (map[c]) return map[c];
    return [{ c: 'err', v: `bash: ${c.split(' ')[0]}: command not found` }];
  };

  const submit = (e) => {
    e.preventDefault();
    const cmd = input;
    const out = [{ c: 'cmd', prompt: true, v: cmd }];
    const res = respond(cmd);
    if (res === null) { setInput(''); return; }
    setLines(l => [...l, ...out, ...res, { c: 'sp', v: '' }]);
    if (cmd.trim()) setHist(h => [...h, cmd]);
    setInput('');
  };
  const onKey = (e) => {
    if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); setInput(hist[hist.length - 1]); }
  };

  if (!open) return null;
  return (
    <>
      <div className="modal-scrim" onClick={onClose} />
      <div className="term-wrap">
        <div className="term" data-kit="SSHTerminal" onClick={() => inputRef.current && inputRef.current.focus()}>
          <div className="term__bar">
            <div className="term__dots"><span style={{ background: '#ff5f57' }} /><span style={{ background: '#febc2e' }} /><span style={{ background: '#28c840' }} /></div>
            <div className="term__title"><Icon name="terminal" size={13} />ssh {host}</div>
            <div className="term__close" onClick={onClose}><Icon name="x" size={15} /></div>
          </div>
          <div className="term__body" ref={bodyRef}>
            {lines.map((l, i) => l.c === 'sp'
              ? <div key={i} className="term__line">&nbsp;</div>
              : l.prompt
                ? <div key={i} className="term__line term__line--cmd"><span className="term__prompt term__prompt--user">{host}</span>:~$ {l.v}</div>
                : <div key={i} className={`term__line term__line--${l.c || 'def'}`}>{l.v}</div>)}
          </div>
          <form className="term__inrow" onSubmit={submit}>
            <span className="term__prompt term__prompt--user">{host}</span><span style={{ color: '#c2cbdc' }}>:~$</span>
            <input ref={inputRef} className="term__input" value={input} spellCheck={false} autoComplete="off"
              onChange={e => setInput(e.target.value)} onKeyDown={onKey} />
          </form>
        </div>
      </div>
    </>
  );
}

/* ---------------- RegisterDeviceSheet ---------------- */
function RegisterDeviceSheet({ open, onClose, onRegister }) {
  const [hwid, setHwid] = useState('');
  const [host, setHost] = useState('');
  const [loc, setLoc] = useState('');
  const [type, setType] = useState('Gateway');
  useEffect(() => { if (open) { setHwid(''); setHost(''); setLoc(''); setType('Gateway'); } }, [open]);
  const valid = hwid.trim() && host.trim();
  return (
    <BottomSheet open={open} onClose={onClose}
      onSave={() => { if (valid) { onRegister({ hwid: hwid.trim(), host: host.trim(), loc: loc.trim(), type }); onClose(); } }}
      title="Register device" sub="Claim a new device into this tenant" saveLabel="Register" saveDisabled={!valid}>
      <div className="formgrid" data-kit="register form">
        <div className="formrow">
          <span className="label">Hardware ID / claiming token</span>
          <div className="field"><Icon name="command" size={15} /><input autoFocus placeholder="E8:DB:84:C1:0A:7F or claim-xxxx" value={hwid} onChange={e => setHwid(e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} /></div>
          <span className="formhint">Printed on the device label or shown during flashing</span>
        </div>
        <div className="formrow">
          <span className="label">Device type</span>
          <div className="seg">
            <button className={type === 'Gateway' ? 'is-on' : ''} onClick={() => setType('Gateway')}><Icon name="cpu" size={15} />Gateway</button>
            <button className={type === 'Sensor' ? 'is-on' : ''} onClick={() => setType('Sensor')}><Icon name="thermo" size={15} />Sensor</button>
          </div>
        </div>
        <div className="formrow">
          <span className="label">Hostname</span>
          <div className="field"><Icon name="devices" size={15} /><input placeholder="edge-gw-madrid-02" value={host} onChange={e => setHost(e.target.value)} /></div>
        </div>
        <div className="formrow">
          <span className="label">Location</span>
          <div className="field"><Icon name="mapPin" size={15} /><input placeholder="Madrid · Nave B" value={loc} onChange={e => setLoc(e.target.value)} /></div>
        </div>
        <div className="dim" style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>The device will appear as <b style={{ color: 'var(--warning)' }}>PENDING_SETUP</b> until it sends its first heartbeat.</div>
      </div>
    </BottomSheet>
  );
}

/* ---------------- UserMenu ---------------- */
function UserMenu({ user, onNav, theme, onToggleTheme }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const initials = user.name.split(' ').map(s => s[0]).slice(0, 2).join('');
  return (
    <div className="usermenu" ref={ref} data-kit="UserMenu">
      <div className="avatar" onClick={() => setOpen(o => !o)} style={{ background: `hsl(${user.hue} 55% 50% / 0.2)`, color: `hsl(${user.hue} 65% 64%)`, borderColor: `hsl(${user.hue} 55% 50% / 0.35)` }}>{initials}</div>
      {open && (
        <div className="menu">
          <div className="menu__head">
            <UserAvatar user={user} size={38} />
            <div style={{ minWidth: 0 }}>
              <div className="menu__name">{user.name}</div>
              <div className="menu__mail">{user.email}</div>
            </div>
          </div>
          <div className="menu__sec">
            <div className="menu__item" onClick={() => { onNav('settings'); setOpen(false); }}><Icon name="user" size={16} />Your profile</div>
            <div className="menu__item" onClick={() => { onNav('settings'); setOpen(false); }}><Icon name="shield" size={16} />Security & sessions</div>
            <div className="menu__item" onClick={() => { onNav('settings'); setOpen(false); }}><Icon name="settings" size={16} />Preferences</div>
          </div>
          <div className="menu__sec">
            <div className="menu__item" onClick={() => { onToggleTheme(); }}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />{theme === 'dark' ? 'Light theme' : 'Dark theme'}</div>
            <div className="menu__item"><Icon name="command" size={16} />Command palette<span className="mono">⌘K</span></div>
          </div>
          <div className="menu__sec">
            <div className="menu__item menu__item--danger"><Icon name="power" size={16} />Sign out</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- BgMenu (dark background switcher) ---------------- */
const BG_OPTIONS = [
  { id: 'flat', label: 'Flat', desc: 'Solid charcoal', sw: 'hsl(222 47% 7%)' },
  { id: 'gradient', label: 'Gradient', desc: 'Top-lit depth', sw: 'linear-gradient(160deg, hsl(221 38% 13%), hsl(225 50% 6%))' },
  { id: 'glow', label: 'Aurora glow', desc: 'Soft accent light', sw: 'radial-gradient(circle at 25% 0%, hsl(217 72% 30%), hsl(223 44% 7%) 70%)' },
  { id: 'warm', label: 'Warm graphite', desc: 'Lower colour temp', sw: 'linear-gradient(160deg, hsl(28 22% 16%), hsl(228 16% 8%))' },
];
function BgMenu({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="usermenu" ref={ref}>
      <button className={`iconbtn ${open ? 'iconbtn--on' : ''}`} onClick={() => setOpen(o => !o)} title="Background" disabled={disabled} style={disabled ? { opacity: .4, cursor: 'not-allowed' } : null}>
        <Icon name="layers" size={17} sw={1.5} />
      </button>
      {open && (
        <div className="menu" style={{ width: 232 }}>
          <div className="menu__sec" style={{ borderBottom: 'none' }}>
            <div className="label" style={{ padding: '4px 8px 8px' }}>Dark background</div>
            {BG_OPTIONS.map(o => (
              <div key={o.id} className="menu__item" onClick={() => { onChange(o.id); setOpen(false); }} style={{ gap: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: o.sw, border: '1px solid var(--border-strong)', flex: 'none' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 550 }}>{o.label}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-dim)', margin: 0 }}>{o.desc}</div>
                </div>
                {value === o.id && <Icon name="check" size={15} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- export ---------------- */
Object.assign(window, {
  Icon, Button, StatusDot, StatusBadge, SeverityBadge, RoleBadge, Checkbox, UserAvatar,
  Sparkline, Chart, MetricCard, DataTable, BottomSheet, FilterChip,
  DevicePicker, UserPicker, MultiSelectPicker, DateRangePicker, MiniCalendar,
  EmptyState, useToast, ToastHost, CommandPalette, STATUS_META, SEV_META,
  CommandSheet, SSHTerminal, RegisterDeviceSheet, UserMenu, BgMenu,
});
