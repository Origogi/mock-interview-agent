import DebugMenu from '../debug/DebugMenu.jsx';

const STEPS = [
  { k: 'home', label: '01 · 시작' },
  { k: 'summary', label: '02 · 분석' },
  { k: 'interview', label: '03 · 면접' },
  { k: 'report', label: '04 · 리포트' },
];

export default function TopBar({ currentPage, serverStatus, onSelectSampleResume, accent = '#6e74ff' }) {
  const ok = serverStatus === 'connected';
  const checking = serverStatus === 'checking';
  const dotColor = checking ? '#a1a1aa' : ok ? '#34c759' : '#ff453a';

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark" style={{ background: accent }}>T</div>
        <span>Tech-Interviewer AI</span>
      </div>
      <div className="crumbs">
        {STEPS.map((s) => (
          <span key={s.k} className={`crumb ${currentPage === s.k ? 'active' : ''}`}>
            {s.label}
          </span>
        ))}
      </div>
      <div className="status">
        <span
          className="dot"
          style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }}
        />
        API {checking ? 'Checking…' : ok ? 'Connected' : 'Offline'}
        <DebugMenu onSelectSampleResume={onSelectSampleResume} />
      </div>
    </div>
  );
}
