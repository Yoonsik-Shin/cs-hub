import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ModalSurface } from './ModalSurface';
import { FeedbackContext } from './feedbackContext';
import type { ConfirmOptions, FeedbackTone } from './feedbackContext';

interface ToastMessage {
  id: number;
  message: string;
  tone: FeedbackTone;
}

interface PendingConfirmation extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const nextToastId = useRef(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, tone: FeedbackTone = 'info') => {
    const id = nextToastId.current += 1;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => dismissToast(id), 5000);
  }, [dismissToast]);

  const requestConfirmation = useCallback((options: ConfirmOptions) => (
    new Promise<boolean>((resolve) => {
      setConfirmation((current) => {
        current?.resolve(false);
        return { ...options, resolve };
      });
    })
  ), []);

  const settleConfirmation = useCallback((confirmed: boolean) => {
    setConfirmation((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({ notify, requestConfirmation }),
    [notify, requestConfirmation],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertCircle : Info;
          return (
            <div key={toast.id} className={`toast-message ${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
              <Icon size={16} />
              <span>{toast.message}</span>
              <button type="button" onClick={() => dismissToast(toast.id)} aria-label="알림 닫기"><X size={14} /></button>
            </div>
          );
        })}
      </div>
      {confirmation && (
        <ModalSurface title={confirmation.title} onClose={() => settleConfirmation(false)} contentStyle={{ maxWidth: '440px' }}>
          <div className="modal-header">
            <h3 className="modal-title">{confirmation.title}</h3>
            <button type="button" className="close-btn" onClick={() => settleConfirmation(false)} aria-label="확인창 닫기"><X size={18} /></button>
          </div>
          <p className="confirmation-message">{confirmation.message}</p>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => settleConfirmation(false)}>{confirmation.cancelLabel || '취소'}</button>
            <button type="button" className={confirmation.tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={() => settleConfirmation(true)} autoFocus>
              {confirmation.confirmLabel || '확인'}
            </button>
          </div>
        </ModalSurface>
      )}
    </FeedbackContext.Provider>
  );
}
