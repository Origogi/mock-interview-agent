import { useEffect, useRef, useState } from 'react';

const TIERS = [
  { key: 'best', emoji: '✨', label: 'Best', score: '7~10' },
  { key: 'good', emoji: '🙂', label: 'Good', score: '5~6' },
  { key: 'bad', emoji: '🥲', label: 'Bad', score: '1~4' },
];

export default function SampleAnswerButton({ onPick, disabled, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectTier = (tierKey) => {
    setIsOpen(false);
    onPick(tierKey);
  };

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      className="iv-sample-wrapper"
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        disabled={isLoading}
        aria-label="샘플 답변 선택"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="iv-sample-btn"
        style={{
          width: '28px',
          height: '28px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          lineHeight: 1,
          color: isLoading ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.56)',
          backgroundColor: isLoading
            ? 'rgba(255, 255, 255, 0.04)'
            : 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '8px',
          cursor: isLoading ? 'default' : 'pointer',
          transition: prefersReducedMotion
            ? 'none'
            : 'all 0.15s cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
        onMouseEnter={(e) => {
          if (isLoading) return;
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.72)';
        }}
        onMouseLeave={(e) => {
          if (isLoading) return;
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.56)';
        }}
        onMouseDown={(e) => {
          if (isLoading) return;
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(110, 116, 255, 0.3)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isLoading ? <span className="iv-sample-spinner" /> : '✨'}
      </button>

      {isOpen && !isLoading && (
        <div
          role="menu"
          className="iv-sample-dropdown"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: '8px',
            width: '240px',
            backgroundColor: 'rgba(24, 24, 27, 0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            zIndex: 1001,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: prefersReducedMotion
              ? 'none'
              : 'sampleAnswerDropupEnter 0.2s cubic-bezier(0.22, 0.61, 0.36, 1)',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.9)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            ✨ 샘플 답변
          </div>
          {TIERS.map((tier, idx) => (
            <button
              key={tier.key}
              type="button"
              role="menuitem"
              onClick={() => handleSelectTier(tier.key)}
              style={{
                width: '100%',
                height: '44px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom:
                  idx < TIERS.length - 1
                    ? '1px solid rgba(255, 255, 255, 0.04)'
                    : 'none',
                borderRadius: 0,
                cursor: 'pointer',
                textAlign: 'left',
                transition: prefersReducedMotion ? 'none' : 'background-color 0.12s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }}
            >
              <span>
                <span style={{ marginRight: '8px' }}>{tier.emoji}</span>
                {tier.label}
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px' }}>
                ({tier.score})
              </span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes sampleAnswerDropupEnter {
          from { opacity: 0; transform: translateY(4px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes sampleAnswerSpinnerSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .iv-sample-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(110, 116, 255, 0.3);
          border-top-color: rgba(110, 116, 255, 1);
          border-radius: 50%;
          display: inline-block;
          animation: sampleAnswerSpinnerSpin 0.8s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .iv-sample-spinner { animation: none; }
        }
      `}</style>
    </div>
  );
}
