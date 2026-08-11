import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image,
  RefreshCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { resolveImageNavigation } from '../features/inquiry/imageViewer';

interface InquiryImageViewerProps {
  imageUrls: readonly string[];
  activeImageUrl: string | null;
  getImageUrl: (url: string) => string;
  onSelectImage: (url: string | null) => void;
}

export function InquiryImageViewer({
  imageUrls,
  activeImageUrl,
  getImageUrl,
  onSelectImage,
}: InquiryImageViewerProps) {
  const [lastActiveImageUrl, setLastActiveImageUrl] = useState<string | null>(activeImageUrl);
  const [previousActiveImageUrl, setPreviousActiveImageUrl] = useState<string | null>(activeImageUrl);
  const [previewWidth, setPreviewWidth] = useState(() => (
    Math.max(320, Math.min(500, window.innerWidth * 0.28))
  ));
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  if (activeImageUrl !== previousActiveImageUrl) {
    setPreviousActiveImageUrl(activeImageUrl);
    if (activeImageUrl) {
      setLastActiveImageUrl(activeImageUrl);
    }
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setIsPanning(false);
  }

  const displayUrl = activeImageUrl || lastActiveImageUrl || imageUrls[0];
  if (!displayUrl) {
    return null;
  }

  const isOpen = activeImageUrl !== null;
  const navigation = resolveImageNavigation(imageUrls, displayUrl);
  const isCompact = previewWidth < 420;

  const startResizing = (event: MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);
    const startX = event.clientX;
    const startWidth = previewWidth;
    const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
      setPreviewWidth(Math.max(280, Math.min(800, startWidth - (moveEvent.clientX - startX))));
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const zoomOut = () => {
    setZoomScale((current) => {
      const next = Math.max(current - 0.25, 1);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const resetZoom = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };
  const startPanning = (event: MouseEvent) => {
    if (zoomScale <= 1) return;
    event.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX - panPosition.x,
      y: event.clientY - panPosition.y,
    };
  };
  const moveImage = (event: MouseEvent) => {
    if (!isPanning || zoomScale <= 1) return;
    event.preventDefault();
    setPanPosition({
      x: event.clientX - panStartRef.current.x,
      y: event.clientY - panStartRef.current.y,
    });
  };

  return (
    <>
      {isOpen && (
        <div
          className={`resize-divider ${isResizing ? 'active' : ''}`}
          onMouseDown={startResizing}
          style={{ height: '100%', margin: '0 6px' }}
        />
      )}
      <div
        className="cs-card"
        style={{
          flex: isOpen ? '0 0 auto' : 0,
          width: isOpen ? `${previewWidth}px` : '0px',
          maxWidth: isOpen ? '800px' : '0px',
          minWidth: isOpen ? '280px' : '0px',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          border: isOpen ? '1px solid var(--border-light)' : '0px solid transparent',
          borderRadius: '12px',
          boxShadow: isOpen ? '0 4px 16px rgba(0, 0, 0, 0.12)' : 'none',
          overflow: 'hidden',
          minHeight: 0,
          transition: isResizing ? 'none' : 'width 0.3s ease, opacity 0.25s ease',
        }}
      >
        <div
          className="cs-panel-section-title"
          style={{
            margin: 0,
            padding: isCompact ? '10px 8px' : '10px 16px',
            borderBottom: '1px solid var(--border-light)',
            background: 'rgba(99, 102, 241, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isCompact ? '4px' : '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? '4px' : '8px' }}>
            {!isCompact && <Image size={16} style={{ color: 'var(--accent-indigo)' }} />}
            <span style={{ fontSize: isCompact ? '11px' : '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {isCompact ? '미리보기' : '첨부 이미지 미리보기'} ({navigation.index + 1} / {imageUrls.length})
            </span>
          </div>
          <div style={{ display: 'flex', gap: isCompact ? '4px' : '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '2px 4px', gap: '4px' }}>
              <ToolbarButton title="축소" disabled={zoomScale <= 1} onClick={zoomOut}><ZoomOut size={14} /></ToolbarButton>
              {!isCompact && <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '36px', textAlign: 'center' }}>{Math.round(zoomScale * 100)}%</span>}
              <ToolbarButton title="확대" disabled={zoomScale >= 3} onClick={() => setZoomScale((current) => Math.min(current + 0.25, 3))}><ZoomIn size={14} /></ToolbarButton>
              <ToolbarButton title="초기화" disabled={zoomScale === 1} onClick={resetZoom}><RefreshCw size={12} /></ToolbarButton>
            </div>
            <a
              href={getImageUrl(displayUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              title="새 탭에서 열기"
              style={{ fontSize: '11px', color: 'var(--accent-indigo)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '28px', padding: isCompact ? 0 : '0 10px', width: isCompact ? '28px' : 'auto' }}
            >
              {isCompact ? <ExternalLink size={14} /> : '새 탭에서 열기'}
            </a>
            <ToolbarButton title="닫기" onClick={() => onSelectImage(null)}><X size={18} /></ToolbarButton>
          </div>
        </div>

        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseDown={startPanning}
          onMouseMove={moveImage}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => { setIsHovered(false); setIsPanning(false); }}
          style={{ position: 'relative', flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', minHeight: 0, overflow: 'hidden' }}
        >
          {navigation.previous && (
            <NavigationButton direction="left" visible={isHovered} onClick={() => onSelectImage(navigation.previous)}>
              <ChevronLeft size={20} />
            </NavigationButton>
          )}
          <img
            src={getImageUrl(displayUrl)}
            referrerPolicy="no-referrer"
            alt="active-preview"
            onDragStart={(event) => event.preventDefault()}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`, transformOrigin: 'center center', cursor: zoomScale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default', transition: isPanning ? 'none' : 'transform 0.15s ease-out', userSelect: 'none' }}
          />
          {navigation.next && (
            <NavigationButton direction="right" visible={isHovered} onClick={() => onSelectImage(navigation.next)}>
              <ChevronRight size={20} />
            </NavigationButton>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', width: '100%', padding: '12px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-light)', overflowX: 'auto', justifyContent: 'center', alignItems: 'center' }}>
          {imageUrls.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => onSelectImage(url)}
              style={{ width: '50px', height: '50px', padding: 0, borderRadius: '6px', border: activeImageUrl === url ? '2px solid var(--accent-indigo)' : '1px solid var(--border-light)', overflow: 'hidden', cursor: 'pointer', background: '#ffffff', flexShrink: 0, transform: activeImageUrl === url ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.2s ease-in-out' }}
            >
              <img src={getImageUrl(url)} alt={`thumb-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

interface ToolbarButtonProps {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({ title, disabled = false, onClick, children }: ToolbarButtonProps) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} style={{ background: 'transparent', border: 'none', cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', color: disabled ? 'var(--text-muted)' : 'var(--text-primary)', padding: '3px' }}>
      {children}
    </button>
  );
}

interface NavigationButtonProps {
  direction: 'left' | 'right';
  visible: boolean;
  onClick: () => void;
  children: ReactNode;
}

function NavigationButton({ direction, visible, onClick, children }: NavigationButtonProps) {
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      style={{ position: 'absolute', [direction]: '16px', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border-light)', boxShadow: '0 2px 5px rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'all 0.2s ease-in-out' }}
    >
      {children}
    </button>
  );
}
