/* ============================================================
   IoT Pilot Console — App shell + router
   ============================================================ */
const NAV = [
  { group: 'Operate', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'device', label: 'Devices', icon: 'devices', badge: '10' },
    { id: 'monitoring', label: 'Monitoring', icon: 'bell', badge: '4' },
    { id: 'logs', label: 'Logs', icon: 'logs' },
  ]},
  { group: 'Administer', items: [
    { id: 'admin', label: 'Users', icon: 'users', badge: '2' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]},
];

const CRUMBS = {
  dashboard: ['Operate', 'Dashboard'],
  device: ['Operate', 'Devices'],
  monitoring: ['Operate', 'Monitoring'],
  logs: ['Operate', 'Logs'],
  admin: ['Administer', 'Users'],
  settings: ['Administer', 'Settings'],
};

function App() {
  const [route, setRoute] = useState('dashboard');
  const [deviceId, setDeviceId] = useState('dev_a1f93c');
  const [theme, setTheme] = useState('dark');
  const [xray, setXray] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { document.body.classList.toggle('xray', xray); }, [xray]);
  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const openDevice = (id) => { setDeviceId(id); setRoute('device-detail'); };

  const navActive = route === 'device-detail' ? 'device' : route;
  const crumbs = route === 'device-detail'
    ? ['Operate', 'Devices', (window.IOT.DEVICES.find(d => d.id === deviceId) || {}).name]
    : CRUMBS[route] || ['Operate'];

  let view;
  if (route === 'dashboard') view = <DashboardView onOpenDevice={openDevice} />;
  else if (route === 'device') view = <DevicesListView onOpenDevice={openDevice} />;
  else if (route === 'device-detail') view = <DeviceDetailView deviceId={deviceId} onBack={() => setRoute('device')} />;
  else if (route === 'monitoring') view = <MonitoringView onOpenDevice={openDevice} />;
  else if (route === 'admin') view = <AdminView />;
  else if (route === 'logs') view = <LogsView />;
  else view = <SettingsStub />;

  return (
    <div className="app">
      {/* ---- Rail ---- */}
      <aside className="rail">
        <div className="rail__brand">
          <div className="brand-mark"><Icon name="zap" size={17} sw={2.2} /></div>
          <div>
            <div className="brand-name">IoT Pilot</div>
            <div className="brand-sub">ops console</div>
          </div>
        </div>
        <div className="rail__scroll">
          {NAV.map(g => (
            <div key={g.group} className="nav-group">
              <div className="nav-group__label">{g.group}</div>
              {g.items.map(it => (
                <div key={it.id} className={`nav-item ${navActive === it.id ? 'nav-item--active' : ''}`} onClick={() => setRoute(it.id)}>
                  <Icon name={it.icon} size={17} />
                  <span>{it.label}</span>
                  {it.badge && <span className="nav-item__badge">{it.badge}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="rail__foot">
          <TenantMenu onNav={setRoute} />
        </div>
      </aside>

      {/* ---- Main ---- */}
      <div className="main">
        <div className="topbar">
          <div className="crumbs">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="crumbs__sep"><Icon name="chevRight" size={13} /></span>}
                <span className={`crumbs__seg ${i === crumbs.length - 1 ? 'crumbs__seg--current' : ''} ${route === 'device-detail' && i === 2 ? 'crumbs__id' : ''}`}>{c}</span>
              </React.Fragment>
            ))}
          </div>
          <button className="searchbtn" onClick={() => setPalette(true)}>
            <Icon name="search" size={15} /><span>Search devices, alerts, users…</span><kbd>⌘K</kbd>
          </button>
          <button className={`iconbtn ${xray ? 'iconbtn--on' : ''}`} onClick={() => setXray(x => !x)} title="Toggle component X-ray">
            <Icon name="frame" size={17} />
          </button>
          <button className="iconbtn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
          <UserMenu user={window.IOT.USERS[0]} onNav={setRoute} theme={theme} onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        </div>

        <div className="content">
          {xray && (
            <div style={{ padding: '20px 26px 0' }}>
              <div className="xray-banner">
                <Icon name="layers" size={16} />
                <span><b>X-ray mode.</b> Every dashed region is a single shared component from <span className="mono">shared/ui</span>. The same <span className="mono">&lt;DevicePicker/&gt;</span>, <span className="mono">&lt;DataTable/&gt;</span> and <span className="mono">&lt;BottomSheet/&gt;</span> are reused across every view — build a screen = pick the pieces.</span>
              </div>
            </div>
          )}
          {view}
        </div>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} onNav={(r) => setRoute(r === 'device' ? 'dashboard' : r)} />
      <ToastHost />
    </div>
  );
}

function SettingsStub() {
  return (
    <div className="page">
      <div className="pagehead"><div><div className="pagehead__title">Settings</div><div className="pagehead__sub">Profile · security · system · notifications</div></div></div>
      <div className="grid-3">
        {[
          { i: 'user', t: 'Profile', d: 'Name, username, display preferences' },
          { i: 'shield', t: 'Security', d: '2FA, sessions, login notifications' },
          { i: 'settings', t: 'System', d: 'Theme, layout, items per page' },
          { i: 'bell', t: 'Notifications', d: 'Channels, severity routing' },
        ].map(c => (
          <div key={c.t} className="card" style={{ cursor: 'pointer' }}>
            <div className="card__body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span className="metric__icon" style={{ background: 'var(--primary-weak)', color: 'var(--primary)', width: 34, height: 34 }}><Icon name={c.i} size={17} /></span>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.t}</div><div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{c.d}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
