import { useEffect, useRef, useState } from 'react';

export default function DebugMenu({ onSelectSampleResume }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectSampleResume = () => {
    onSelectSampleResume?.();
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      {/* Debug Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          height: '28px',
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.56)',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '999px',
          cursor: 'pointer',
          transition: 'all 0.15s cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
          e.target.style.color = 'rgba(255, 255, 255, 0.72)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
          e.target.style.color = 'rgba(255, 255, 255, 0.56)';
        }}
        onMouseDown={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
          e.target.style.boxShadow = '0 0 0 2px rgba(110, 116, 255, 0.3)';
        }}
        onMouseUp={(e) => {
          e.target.style.boxShadow = 'none';
        }}
      >
        Debug
      </button>

      {/* Modal Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: '280px',
            maxHeight: '400px',
            backgroundColor: 'rgba(24, 24, 27, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '18px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            Debug Menu
          </div>

          {/* Menu Items */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <button
              onClick={handleSelectSampleResume}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              샘플 이력서로 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
