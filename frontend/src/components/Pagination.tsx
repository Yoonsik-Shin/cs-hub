import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  loading: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  hasNext,
  onPrev,
  onNext,
  loading,
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '2px', paddingBottom: '0px' }}>
      <button
        type="button"
        className="page-btn"
        onClick={onPrev}
        disabled={currentPage === 1 || loading}
        title="이전 페이지"
      >
        <ChevronLeft size={13} />
      </button>

      <span className="page-number">
        <strong>{currentPage}</strong>
      </span>

      <button
        type="button"
        className="page-btn"
        onClick={onNext}
        disabled={!hasNext || loading}
        title="다음 페이지"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
};
