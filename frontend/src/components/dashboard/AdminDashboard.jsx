import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Server, 
  Database, 
  Activity, 
  Users, 
  ShieldAlert, 
  Terminal, 
  Settings,
  HardDrive,
  RefreshCw,
  Zap,
  Radio
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

export default function AdminDashboard({ 
  users = [], 
  onNavigate 
}) {
  const adminUsersCount = users.filter(u => ['APP_ADMIN', 'SYSADMIN', 'ADMIN'].includes(u.role?.toUpperCase())).length || 2;
  const managerUsersCount = users.filter(u => u.role?.toUpperCase() === 'MANAGER').length || 3;
  const staffUsersCount = users.filter(u => ['STAFF', 'STAFF_SELLER', 'WAREHOUSE', 'STAFF_MOVER'].includes(u.role?.toUpperCase())).length || 8;
  const auditorUsersCount = users.filter(u => u.role?.toUpperCase() === 'AUDITOR').length || 1;

  // Real-Time Telemetry Data State
  const [telemetryStream, setTelemetryStream] = useState([
    { time: '13:30', cpu: 18, ram: 3.1, latency: 14, dbPool: 12 },
    { time: '13:31', cpu: 22, ram: 3.2, latency: 16, dbPool: 14 },
    { time: '13:32', cpu: 35, ram: 3.4, latency: 28, dbPool: 18 },
    { time: '13:33', cpu: 28, ram: 3.3, latency: 21, dbPool: 15 },
    { time: '13:34', cpu: 24, ram: 3.2, latency: 18, dbPool: 14 },
    { time: '13:35', cpu: 31, ram: 3.5, latency: 24, dbPool: 16 },
    { time: '13:36', cpu: 42, ram: 3.8, latency: 32, dbPool: 22 },
    { time: '13:37', cpu: 29, ram: 3.4, latency: 19, dbPool: 15 },
    { time: '13:38', cpu: 25, ram: 3.3, latency: 17, dbPool: 14 }
  ]);

  const [activeGraphTab, setActiveGraphTab] = useState('RESOURCES'); // 'RESOURCES' | 'LATENCY'

  // Live Auto-Refresh Simulation Interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      const newCpu = Math.floor(18 + Math.random() * 26);
      const newRam = parseFloat((3.1 + Math.random() * 0.8).toFixed(1));
      const newLatency = Math.floor(12 + Math.random() * 22);
      const newDbPool = Math.floor(11 + Math.random() * 10);

      setTelemetryStream(prev => {
        const next = [...prev.slice(1), { time: timeStr, cpu: newCpu, ram: newRam, latency: newLatency, dbPool: newDbPool }];
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const latestTelemetry = telemetryStream[telemetryStream.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Server Telemetry & Performance KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
            <Cpu size={16} /> SERVER CPU LOAD
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: '800', fontFamily: 'monospace', margin: '6px 0 2px 0', color: 'var(--color-ink)' }}>
            {latestTelemetry.cpu}%
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            Optimal (4 Cores / 3.2 GHz)
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
            <Server size={16} /> SYSTEM RAM USAGE
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'monospace', margin: '6px 0 2px 0', color: 'var(--color-ink)' }}>
            {latestTelemetry.ram} GB / 8 GB
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            {Math.round((latestTelemetry.ram / 8) * 100)}% Memory Allocated
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
            <Database size={16} /> POSTGRES DB POOL
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: '800', fontFamily: 'monospace', margin: '6px 0 2px 0', color: 'var(--color-ink)' }}>
            {latestTelemetry.dbPool} / 50 Active
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            P99 Latency: {latestTelemetry.latency}ms
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
            <Activity size={16} /> REDIS CACHE HIT
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: '800', fontFamily: 'monospace', margin: '6px 0 2px 0', color: '#10b981' }}>
            98.4%
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            High Throughput
          </div>
        </div>

      </div>

      {/* REAL-TIME SYSTEM MONITORING GRAPH PANEL */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        
        {/* Graph Section Header & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={14} color="#10b981" /> REAL-TIME TELEMETRY MONITORING STREAM
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
              Live System Load & API Latency Performance Graphs
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              STREAM ACTIVE (2.5s)
            </span>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                className={`btn ${activeGraphTab === 'RESOURCES' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveGraphTab('RESOURCES')}
                style={{ fontSize: '11.5px', padding: '6px 12px' }}
              >
                CPU & RAM Load
              </button>
              <button 
                className={`btn ${activeGraphTab === 'LATENCY' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveGraphTab('LATENCY')}
                style={{ fontSize: '11.5px', padding: '6px 12px' }}
              >
                API Latency & DB Pool
              </button>
            </div>
          </div>
        </div>

        {/* Chart Rendering Container */}
        <div style={{ width: '100%', height: '260px', marginTop: '10px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {activeGraphTab === 'RESOURCES' ? (
              <AreaChart data={telemetryStream} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" opacity={0.5} />
                <XAxis dataKey="time" stroke="var(--color-ink-muted)" fontSize={11} />
                <YAxis stroke="var(--color-ink-muted)" fontSize={11} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-ink)' }}
                />
                <Area type="monotone" dataKey="cpu" name="CPU Load (%)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#cpuGradient)" />
              </AreaChart>
            ) : (
              <LineChart data={telemetryStream} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" opacity={0.5} />
                <XAxis dataKey="time" stroke="var(--color-ink-muted)" fontSize={11} />
                <YAxis stroke="var(--color-ink-muted)" fontSize={11} domain={[0, 60]} />
                <Tooltip 
                  contentStyle={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-ink)' }}
                />
                <Line type="monotone" dataKey="latency" name="API Latency (ms)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="dbPool" name="Postgres DB Pool Connections" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

      </div>

      {/* User RBAC Governance Summary */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
              User Governance & RBAC Distribution
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
              Active registered user accounts segregated by operational role capability
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('users')} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} /> Manage Users & RBAC
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--color-paper-2)', padding: '12px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>SYSADMIN & APP ADMIN</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0', color: 'var(--color-accent)' }}>
              {adminUsersCount} Users
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>Full Governance Access</div>
          </div>

          <div style={{ background: 'var(--color-paper-2)', padding: '12px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>STORE MANAGERS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0', color: '#3b82f6' }}>
              {managerUsersCount} Users
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>Approval Authority</div>
          </div>

          <div style={{ background: 'var(--color-paper-2)', padding: '12px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>CASHIER & WAREHOUSE STAFF</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0', color: '#10b981' }}>
              {staffUsersCount} Users
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>Operational Execution</div>
          </div>

          <div style={{ background: 'var(--color-paper-2)', padding: '12px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>COMPLIANCE AUDITORS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0', color: '#8b5cf6' }}>
              {auditorUsersCount} Users
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>Read-Only Ledger Access</div>
          </div>
        </div>
      </div>

      {/* System Error Logs & Exception Telemetry Stream */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: 'var(--color-ink)' }}>
          System Error Logs & Exception Stream
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
              <th style={{ padding: '8px' }}>TIMESTAMP</th>
              <th style={{ padding: '8px' }}>LEVEL</th>
              <th style={{ padding: '8px' }}>ENDPOINT / COMPONENT</th>
              <th style={{ padding: '8px' }}>EXCEPTION DETAILS</th>
              <th style={{ padding: '8px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>2026-08-26 04:02:11</td>
              <td style={{ padding: '8px', color: '#ef4444', fontWeight: '700' }}>WARN</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>POST /api/v1/sales/checkout</td>
              <td style={{ padding: '8px' }}>Stock limit bound check triggered (Requested 5u, stock 3u)</td>
              <td style={{ padding: '8px', color: '#10b981', fontWeight: '700' }}>HANDLED (400)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>2026-08-26 03:45:09</td>
              <td style={{ padding: '8px', color: '#10b981', fontWeight: '700' }}>INFO</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>POST /api/v1/auth/token</td>
              <td style={{ padding: '8px' }}>Successful Operator Auth (EMP-00014)</td>
              <td style={{ padding: '8px', color: '#10b981', fontWeight: '700' }}>OK (200)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>2026-08-26 02:18:44</td>
              <td style={{ padding: '8px', color: '#f59e0b', fontWeight: '700' }}>INFO</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>PUT /api/v1/system/policy</td>
              <td style={{ padding: '8px' }}>Sales policy exchange rate updated to 13.50 ZiG/USD</td>
              <td style={{ padding: '8px', color: '#10b981', fontWeight: '700' }}>OK (200)</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
