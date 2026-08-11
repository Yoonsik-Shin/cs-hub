import { createContext, useContext } from 'react';

export type FeedbackTone = 'success' | 'error' | 'info';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
}

export interface FeedbackContextValue {
  notify: (message: string, tone?: FeedbackTone) => void;
  requestConfirmation: (options: ConfirmOptions) => Promise<boolean>;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider.');
  return context;
}
