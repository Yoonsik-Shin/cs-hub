import type { MouseEvent as ReactMouseEvent } from 'react';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import type { TimelineItem } from '../features/inquiry/timeline';
import { InquiryTimeline } from './InquiryTimeline';

interface InquiryHistoryPaneProps {
  leftWidth: number;
  collapsed: boolean;
  resizing: boolean;
  items: readonly TimelineItem[];
  loadingLogs: boolean;
  loadingReplies: boolean;
  error: string | null;
  activeImageUrl: string | null;
  getImageUrl: (url: string) => string;
  onSelectImage: (url: string | null) => void;
  onResizeStart: (event: ReactMouseEvent) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function InquiryHistoryPane({
  leftWidth,
  collapsed,
  resizing,
  items,
  loadingLogs,
  loadingReplies,
  error,
  activeImageUrl,
  getImageUrl,
  onSelectImage,
  onResizeStart,
  onCollapsedChange,
}: InquiryHistoryPaneProps) {
  return (
    <>
      {!collapsed && <div className={`resize-divider ${resizing ? 'active' : ''}`} onMouseDown={onResizeStart} />}
      <aside
        className="detail-modal-right-pane"
        style={{
          width: collapsed ? '48px' : `${100 - leftWidth}%`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: collapsed ? '12px 0' : '12px 16px',
          overflow: 'hidden',
          borderLeft: '1px solid var(--border-light)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', width: '100%', gap: '16px' }}>
            <button type="button" onClick={() => onCollapsedChange(false)} title="이력 펼치기" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ writingMode: 'vertical-rl', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px' }}>업무 처리 이력</span>
            </div>
          </div>
        ) : (
          <div className="cs-reference-panel" style={{ border: 'none', padding: 0, boxShadow: 'none', background: 'transparent', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="cs-panel-section-title" style={{ margin: 0, padding: '10px 12px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                <History size={16} style={{ color: '#64748b' }} /> 업무 처리 이력
              </span>
              <button type="button" onClick={() => onCollapsedChange(true)} title="이력 접기" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <InquiryTimeline items={items} loadingLogs={loadingLogs} loadingReplies={loadingReplies} error={error} activeImageUrl={activeImageUrl} getImageUrl={getImageUrl} onSelectImage={onSelectImage} />
          </div>
        )}
      </aside>
    </>
  );
}
