import type { CustomerInquiry, OperatorInfo } from '../types/inquiry';
import { InquiryDetailPanel } from './InquiryDetailPanel';

interface SelectedInquiryPaneProps {
  inquiry?: CustomerInquiry;
  operator: OperatorInfo | null;
  bookmarked: boolean;
  onUpdateInquiry: (id: string, updatedFields: Partial<CustomerInquiry>) => void;
  onToggleBookmark: (id: string) => Promise<void>;
  onRequireNaverSessionRenew: () => void;
}

export function SelectedInquiryPane({
  inquiry,
  operator,
  bookmarked,
  onUpdateInquiry,
  onToggleBookmark,
  onRequireNaverSessionRenew,
}: SelectedInquiryPaneProps) {
  return (
    <section className="dashboard-detail-pane">
      {inquiry ? (
        <InquiryDetailPanel
          key={inquiry.id}
          inquiry={inquiry}
          operator={operator}
          onUpdateInquiry={onUpdateInquiry}
          isBookmarked={bookmarked}
          onToggleBookmark={onToggleBookmark}
          onRequireNaverSessionRenew={onRequireNaverSessionRenew}
        />
      ) : (
        <div className="detail-pane-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '16px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '40px', textAlign: 'center' }}>
          <span style={{ fontSize: '48px' }}>🔍</span>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600 }}>선택된 문의가 없습니다</h3>
          <p style={{ fontSize: '14px', maxWidth: '320px' }}>목록에서 문의 건을 클릭하시면 상세한 내용과 실시간 처리 콘솔이 노출됩니다.</p>
        </div>
      )}
    </section>
  );
}
