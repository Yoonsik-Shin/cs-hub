import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  maxPage: number;
  onPageClick: (page: number) => void;
  loading: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  maxPage,
  onPageClick,
  loading,
}) => {
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(maxPage, currentPage + 1);

  const pages: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '2px', paddingBottom: '0px' }}>
      <button
        type="button"
        className="page-btn"
        onClick={() => onPageClick(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        title="이전 페이지"
      >
        <ChevronLeft size={13} />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`page-btn ${p === currentPage ? 'active' : ''}`}
          onClick={() => onPageClick(p)}
          disabled={loading}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        className="page-btn"
        onClick={() => onPageClick(currentPage + 1)}
        disabled={currentPage === maxPage || loading}
        title="다음 페이지"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
};
