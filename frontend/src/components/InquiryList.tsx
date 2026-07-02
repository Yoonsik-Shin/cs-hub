import React from 'react';
import { InquiryCard } from './InquiryCard';
import type { CustomerInquiry } from '../types/inquiry';

interface InquiryListProps {
  inquiries: CustomerInquiry[];
  loading: boolean;
  selectedInquiryId: string | null;
  onSelectInquiry: (id: string) => void;
  bookmarkedIds?: Set<string>;
  selectedInquiryIds?: Set<string>;
  onToggleSelectInquiry?: (id: string, checked: boolean) => void;
  isBatchSelectionMode?: boolean;
}

export const InquiryList: React.FC<InquiryListProps> = ({ 
  inquiries, 
  loading, 
  selectedInquiryId,
  onSelectInquiry,
  bookmarkedIds = new Set(),
  selectedInquiryIds = new Set(),
  onToggleSelectInquiry,
  isBatchSelectionMode = false
}) => {
  if (loading) {
    return (
      <div className="inquiry-list">
        {/* Loading Skeletons */}
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton-card glass-card skeleton">
            <div className="skeleton skeleton-text short" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text half" />
          </div>
        ))}
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div 
        style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          padding: '24px 16px',
          minHeight: 0,
        }}
      >
        <span style={{ fontSize: '28px', opacity: 0.5 }}>💬</span>
        <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', margin: 0 }}>조회된 문의 내역이 없습니다</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>필터 조건을 변경하거나 검색어를 다르게 입력해 보세요.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className={`inquiry-list${isBatchSelectionMode ? ' selection-active' : ''}`}>
        {inquiries.map((inquiry, index) => (
          <InquiryCard 
            key={inquiry.id} 
            inquiry={inquiry} 
            index={isBatchSelectionMode ? index + 1 : undefined}
            isSelected={inquiry.id === selectedInquiryId}
            isBookmarked={bookmarkedIds.has(inquiry.id)}
            onClick={() => onSelectInquiry(inquiry.id)}
            showCheckbox={isBatchSelectionMode}
            isChecked={selectedInquiryIds.has(inquiry.id)}
            onCheckboxChange={onToggleSelectInquiry}
          />
        ))}
      </div>
    </div>
  );
};
