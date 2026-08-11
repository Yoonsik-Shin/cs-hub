import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalLifecycle } from './useModalLifecycle';

interface ModalSurfaceProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  labelledBy?: string;
  closeDisabled?: boolean;
  closeOnBackdrop?: boolean;
  overlayClassName?: string;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
}

export function ModalSurface({
  children,
  onClose,
  title,
  labelledBy,
  closeDisabled = false,
  closeOnBackdrop = true,
  overlayClassName = 'modal-overlay',
  contentClassName = 'modal-content',
  contentStyle,
}: ModalSurfaceProps) {
  const generatedTitleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = labelledBy || (title ? generatedTitleId : undefined);

  useModalLifecycle({ closeDisabled, onClose, containerRef: contentRef });

  return createPortal(
    <div
      className={overlayClassName}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeOnBackdrop && !closeDisabled) onClose();
      }}
    >
      <div
        ref={contentRef}
        className={contentClassName}
        style={contentStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={titleId ? undefined : '대화상자'}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title && <span id={titleId} className="sr-only">{title}</span>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
