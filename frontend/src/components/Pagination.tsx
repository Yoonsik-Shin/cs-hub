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
    <div className="pagination-container">
      {/* Prev button */}
      <button
        type="button"
        className="page-btn"
        onClick={onPrev}
        disabled={currentPage === 1 || loading}
      >
        <ChevronLeft size={16} />
        이전
      </button>

      {/* Page indicator */}
      <span className="page-number">
        현재 페이지 <strong>{currentPage}</strong>
      </span>

      {/* Next button */}
      <button
        type="button"
        className="page-btn"
        onClick={onNext}
        disabled={!hasNext || loading}
      >
        다음
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
