import React from 'react';
import { InquiryCard } from './InquiryCard';
import type { CustomerInquiry } from '../types/inquiry';
import { ArrowUpDown } from 'lucide-react';

interface InquiryListProps {
  inquiries: CustomerInquiry[];
  loading: boolean;
  onRefresh?: () => void;
  onUpdateInquiry?: (id: string, updatedFields: Partial<CustomerInquiry>) => void;
}

export const InquiryList: React.FC<InquiryListProps> = ({ inquiries, loading, onRefresh, onUpdateInquiry }) => {
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
        className="glass-card" 
        style={{ 
          padding: '60px 20px', 
          textAlign: 'center', 
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <span style={{ fontSize: '32px' }}>💬</span>
        <h3 style={{ color: 'var(--text-primary)', fontWeight: 600 }}>조회된 문의 내역이 없습니다</h3>
        <p style={{ fontSize: '13px' }}>필터 조건을 변경하거나 검색어를 다르게 입력해 보세요.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="list-section-header">
        <div className="list-count">
          총 <strong>{inquiries.length}</strong> 건의 문의가 로드되었습니다
        </div>
        <div className="list-sort-info">
          <ArrowUpDown size={14} />
          정렬기준: 등록일 기준 최신순
        </div>
      </div>
      
      <div className="inquiry-list">
        {inquiries.map((inquiry) => (
          <InquiryCard 
            key={inquiry.id} 
            inquiry={inquiry} 
            onUpdateInquiry={onUpdateInquiry} 
            onRefresh={onRefresh} 
          />
        ))}
      </div>
    </div>
  );
};
