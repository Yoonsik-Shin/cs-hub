import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface InlineAlertProps {
  children: React.ReactNode;
  tone?: 'error' | 'success' | 'info';
  id?: string;
  className?: string;
}

export function InlineAlert({ children, tone = 'error', id, className = '' }: InlineAlertProps) {
  const Icon = tone === 'error' ? AlertTriangle : tone === 'success' ? CheckCircle2 : Info;
  return (
    <div id={id} className={`inline-alert ${tone} ${className}`.trim()} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={14} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
