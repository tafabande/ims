import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send,
  UserPlus,
  Zap,
  Coffee
} from 'lucide-react';

export default function ShiftCalendarWidget({ onNavigate }) {
  const [selectedDate, setSelectedDate] = useState('2026-08-28');
  const [viewMode, setViewMode] = useState('CALENDAR'); // 'CALENDAR' | 'ALERTS'

  // Mock Working Days & Shift Roster Data for August 2026
  const rosterDays = [
    { date: '2026-08-24', dayName: 'Mon', dayNum: 24, status: 'OPTIMAL', scheduled: 8, required: 8, peak: false, cashiers: 4, warehouse: 3, managers: 1 },
    { date: '2026-08-25', dayName: 'Tue', dayNum: 25, status: 'OPTIMAL', scheduled: 8, required: 8, peak: false, cashiers: 4, warehouse: 3, managers: 1 },
    { date: '2026-08-26', dayName: 'Wed', dayNum: 26, status: 'OPTIMAL', scheduled: 9, required: 8, peak: false, cashiers: 5, warehouse: 3, managers: 1 },
    { date: '2026-08-27', dayName: 'Thu', dayNum: 27, status: 'ADEQUATE', scheduled: 7, required: 8, peak: false, cashiers: 4, warehouse: 2, managers: 1 },
    { date: '2026-08-28', dayName: 'Fri', dayNum: 28, status: 'UNDERSTAFFED', scheduled: 6, required: 9, peak: true, cashiers: 3, warehouse: 2, managers: 1, shortage: 3 },
    { date: '2026-08-29', dayName: 'Sat', dayNum: 29, status: 'UNDERSTAFFED', scheduled: 5, required: 8, peak: true, cashiers: 3, warehouse: 1, managers: 1, shortage: 3 },
    { date: '2026-08-30', dayName: 'Sun', dayNum: 30, status: 'OPTIMAL', scheduled: 5, required: 5, peak: false, cashiers: 3, warehouse: 1, managers: 1 },
    { date: '2026-08-31', dayName: 'Mon', dayNum: 31, status: 'OPTIMAL', scheduled: 8, required: 8, peak: false, cashiers: 4, warehouse: 3, managers: 1 },
    { date: '2026-09-01', dayName: 'Tue', dayNum: 1, status: 'UNDERSTAFFED', scheduled: 6, required: 8, peak: false, cashiers: 3, warehouse: 2, managers: 1, shortage: 2 }
  ];

  const activeDayData = rosterDays.find(d => d.date === selectedDate) || rosterDays[4];
  const understaffedDaysList = rosterDays.filter(d => d.status === 'UNDERSTAFFED');

  return (
    <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
      
      {/* Header & View Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '2px' }}>
            STORE ROSTER & WORKING DAYS CALENDAR
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={18} color="var(--color-accent)" /> Working Days Roster & Shift Planning
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${viewMode === 'CALENDAR' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setViewMode('CALENDAR')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Calendar Grid
          </button>
          <button 
            className={`btn ${viewMode === 'ALERTS' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setViewMode('ALERTS')}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <AlertTriangle size={14} color={understaffedDaysList.length > 0 ? '#ef4444' : 'currentColor'} />
            Understaffed Alerts ({understaffedDaysList.length})
          </button>
        </div>
      </div>

      {viewMode === 'CALENDAR' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Working Days Grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>August - September 2026</span>
              <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--color-ink-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Understaffed
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Optimal
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></span> Peak Volume
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {rosterDays.map((item) => {
                const isSelected = item.date === selectedDate;
                const isUnderstaffed = item.status === 'UNDERSTAFFED';
                
                return (
                  <div
                    key={item.date}
                    onClick={() => setSelectedDate(item.date)}
                    style={{
                      background: isSelected ? 'var(--color-paper-2)' : 'var(--color-paper-surface)',
                      border: isSelected 
                        ? '2px solid var(--color-accent)' 
                        : isUnderstaffed 
                          ? '1px solid rgba(239, 68, 68, 0.4)' 
                          : '1px solid var(--color-rule)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '10px 6px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>
                      {item.dayName}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0', color: 'var(--color-ink)' }}>
                      {item.dayNum}
                    </div>

                    <div style={{ marginTop: '4px' }}>
                      {isUnderstaffed ? (
                        <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '9.5px', fontWeight: 800, padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>
                          -{item.shortage} Staff
                        </span>
                      ) : item.peak ? (
                        <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontSize: '9.5px', fontWeight: 800, padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>
                          PEAK
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '9.5px', fontWeight: 800, padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>
                          {item.scheduled}/{item.required}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Roster Details Card */}
          <div style={{ background: 'var(--color-paper-2)', padding: '16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>ROSTER INSPECTION FOR</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                    {activeDayData.dayName}, {activeDayData.date}
                  </div>
                </div>

                {activeDayData.status === 'UNDERSTAFFED' ? (
                  <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 800, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={13} /> UNDERSTAFFED DAY
                  </span>
                ) : (
                  <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> COVERAGE OPTIMAL
                  </span>
                )}
              </div>

              {activeDayData.status === 'UNDERSTAFFED' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 12px', borderRadius: 'var(--radius-xs)', marginBottom: '14px', fontSize: '12px', color: '#ef4444', lineHeight: 1.4 }}>
                  <strong>⚠️ Understaffed Alert Warning:</strong> High expected store volume! Scheduled count is {activeDayData.scheduled} staff vs required {activeDayData.required} staff ({activeDayData.shortage} cashiers/movers missing).
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-rule)' }}>
                  <span style={{ color: 'var(--color-ink-muted)' }}>Front-Desk Cashiers Scheduled:</span>
                  <span style={{ fontWeight: 800, color: activeDayData.cashiers < 4 ? '#ef4444' : 'var(--color-ink)' }}>
                    {activeDayData.cashiers} / 5 Required
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-rule)' }}>
                  <span style={{ color: 'var(--color-ink-muted)' }}>Warehouse & Logistics Staff:</span>
                  <span style={{ fontWeight: 800, color: activeDayData.warehouse < 3 ? '#f59e0b' : 'var(--color-ink)' }}>
                    {activeDayData.warehouse} / 3 Required
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--color-ink-muted)' }}>Store Manager on Duty:</span>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>
                    1 Active (On-Call)
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => onNavigate('shifts')}
                style={{ flex: 1, fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <UserPlus size={14} /> Assign Shift Cover
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Understaffed Days Alert View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--color-ink-muted)' }}>
            The following working days have been flagged with staff shortages relative to predicted retail sales traffic.
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                <th style={{ padding: '8px' }}>DATE / DAY</th>
                <th style={{ padding: '8px' }}>EXPECTED TRAFFIC</th>
                <th style={{ padding: '8px' }}>SCHEDULED vs REQUIRED</th>
                <th style={{ padding: '8px' }}>SHORTAGE GAP</th>
                <th style={{ padding: '8px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {understaffedDaysList.map((day) => (
                <tr key={day.date} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '8px', fontWeight: 800, color: 'var(--color-ink)' }}>
                    {day.dayName}, {day.date}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {day.peak ? (
                      <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontWeight: 800, fontSize: '11px' }}>
                        HIGH PEAK TRAFFIC
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-ink-muted)' }}>Standard Weekend</span>
                    )}
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700 }}>
                    {day.scheduled} Staff / {day.required} Required
                  </td>
                  <td style={{ padding: '8px', color: '#ef4444', fontWeight: 800 }}>
                    -{day.shortage} Staff Shortage
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => onNavigate('shifts')}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Call In Staff →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
