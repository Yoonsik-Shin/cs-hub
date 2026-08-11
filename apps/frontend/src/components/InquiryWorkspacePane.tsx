import type { Dispatch, MouseEvent as ReactMouseEvent, SetStateAction } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ListChecks, RefreshCw } from 'lucide-react';
import type { CustomFilterEntity, CustomerInquiry, InquiryStatus } from '../types/inquiry';
import type { FilterValues } from './FilterBar';
import { FilterBar } from './FilterBar';
import { InquiryList } from './InquiryList';
import { Pagination } from './Pagination';
import { InlineAlert } from './ui/InlineAlert';
import { getStatusLabel } from '../features/inquiry/policy';
import type { PageCache } from '../features/inquiry/pageCache';

interface InquiryWorkspacePaneProps {
  width: number;
  collapsed: boolean;
  resizing: boolean;
  totalCount: number;
  totalHasMore: boolean;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  refreshInterval: number;
  sortOrder: 'asc' | 'desc';
  inquiries: CustomerInquiry[];
  selectedInquiryId: string | null;
  bookmarkedIds: Set<string>;
  batchMode: boolean;
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  batchBaseOffset: number;
  hasNext: boolean;
  currentPage: number;
  pageCache: PageCache<CustomerInquiry>;
  filters: FilterValues;
  customFilters: CustomFilterEntity[];
  onCollapseChange: (collapsed: boolean) => void;
  onResizeStart: (event: ReactMouseEvent) => void;
  onManualRefresh: () => void;
  onRefreshIntervalChange: (value: number) => void;
  onSortOrderChange: () => void;
  onBatchModeStart: () => void;
  onBatchModeCancel: () => void;
  onToggleSelectAll: () => void;
  onLoadMore: () => void;
  onSelectInquiry: (id: string) => void;
  onToggleSelectInquiry: (id: string, checked: boolean) => void;
  onRequestBatchStatus: (status: InquiryStatus) => void;
  onPageClick: (page: number) => void;
  onFilterChange: Dispatch<SetStateAction<FilterValues>>;
  onSaveCustomFilter: (name: string, values: FilterValues) => Promise<void>;
  onDeleteCustomFilter: (id: number) => Promise<void>;
}

export function InquiryWorkspacePane({
  width,
  collapsed,
  resizing,
  totalCount,
  totalHasMore,
  loading,
  refreshing,
  loadingMore,
  error,
  refreshInterval,
  sortOrder,
  inquiries,
  selectedInquiryId,
  bookmarkedIds,
  batchMode,
  selectedIds,
  allVisibleSelected,
  someVisibleSelected,
  batchBaseOffset,
  hasNext,
  currentPage,
  pageCache,
  filters,
  customFilters,
  onCollapseChange,
  onResizeStart,
  onManualRefresh,
  onRefreshIntervalChange,
  onSortOrderChange,
  onBatchModeStart,
  onBatchModeCancel,
  onToggleSelectAll,
  onLoadMore,
  onSelectInquiry,
  onToggleSelectInquiry,
  onRequestBatchStatus,
  onPageClick,
  onFilterChange,
  onSaveCustomFilter,
  onDeleteCustomFilter,
}: InquiryWorkspacePaneProps) {
  const selectedCount = selectedIds.size;
  const loadedPages = Object.keys(pageCache).map(Number);
  const maxLoadedPage = loadedPages.length > 0 ? Math.max(...loadedPages) : 1;
  const hasNextFromMax = pageCache[maxLoadedPage]?.hasNext ?? hasNext;
  const maxAvailablePage = hasNextFromMax ? maxLoadedPage + 1 : maxLoadedPage;
  const countLabel = totalHasMore ? `${totalCount}+` : totalCount;

  return (
    <>
      <main
        className="dashboard-main-content"
        style={{
          width: collapsed ? '56px' : `${width}px`,
          minWidth: collapsed ? '56px' : undefined,
          padding: collapsed ? '20px 0' : '20px 8px 8px',
          alignItems: collapsed ? 'center' : undefined,
          overflow: 'hidden',
          transition: resizing ? 'none' : 'width 0.2s ease',
          position: 'relative',
        }}
      >
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', width: '100%', padding: '12px 0' }}>
            <button
              type="button"
              onClick={() => onCollapseChange(false)}
              title="목록 펼치기"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', width: '40px', justifyContent: 'center' }}
            >
              <ChevronRight size={18} />
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ writingMode: 'vertical-rl', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px' }}>
                문의 목록
              </span>
            </div>
            <div
              title={`필터된 문의 수: ${totalHasMore ? '100개 이상' : `${totalCount}개`}`}
              style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: totalHasMore ? '10px' : '11px', fontWeight: 700 }}
            >
              {countLabel}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, width: '100%', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>문의 목록</span>
                <span style={{ background: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-indigo)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                  {countLabel}
                </span>
              </div>
              <div className="list-header-actions">
                <div className="auto-refresh-container">
                  <button
                    type="button"
                    onClick={onManualRefresh}
                    className="auto-refresh-btn action-tooltip"
                    data-tooltip={batchMode && selectedCount > 0 ? '선택 항목 초기화 후 새로고침' : '즉시 새로고침'}
                    disabled={loading || refreshing}
                  >
                    <RefreshCw size={12} className={refreshing ? 'spin' : ''} />
                  </button>
                  <div className="auto-refresh-divider" />
                  <div className="action-tooltip" data-tooltip="자동 새로고침 주기" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <select
                      value={refreshInterval}
                      onChange={(event) => onRefreshIntervalChange(Number(event.target.value))}
                      className={`auto-refresh-select${refreshInterval > 0 ? ' active' : ''}`}
                    >
                      <option value={0}>Off</option>
                      <option value={10}>10s</option>
                      <option value={30}>30s</option>
                      <option value={60}>1m</option>
                      <option value={300}>5m</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={onSortOrderChange} className="auto-refresh-btn action-tooltip" data-tooltip={sortOrder === 'desc' ? '최신순 (클릭 시 오래된순)' : '오래된순 (클릭 시 최신순)'}>
                  {sortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                </button>
                {inquiries.length > 0 && !loading && (
                  <button type="button" className={`batch-mode-btn action-tooltip tooltip-left${batchMode ? ' active' : ''}`} onClick={batchMode ? onBatchModeCancel : onBatchModeStart} data-tooltip={batchMode ? '선택 종료' : '배치 처리 (일괄 상태 변경)'}>
                    <ListChecks size={14} />
                    <span>배치 처리</span>
                  </button>
                )}
                <button type="button" onClick={() => onCollapseChange(true)} className="action-tooltip tooltip-left" data-tooltip="목록 접기" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>

            <div style={{ flexShrink: 0, width: '100%', padding: '0 4px' }}>
              <FilterBar initialValues={filters} onSearch={onFilterChange} customFilters={customFilters} onSaveCustomFilter={onSaveCustomFilter} onDeleteCustomFilter={onDeleteCustomFilter} />
            </div>

            {batchMode && inquiries.length > 0 && !loading ? (
              <div className="batch-workspace-container">
                <div className="batch-workspace-controls-top">
                  <div className="batch-control-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="batch-workspace-title">일괄 처리 모드</span>
                      <span className="batch-selection-badge">{selectedCount}개 선택됨</span>
                    </div>
                    <button type="button" className="batch-btn-cancel-top" onClick={onBatchModeCancel}>선택 종료</button>
                  </div>
                  <div className="batch-scope-selectors">
                    <label className="batch-scope-checkbox-wrapper" style={{ width: '100%' }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(element) => {
                          if (element) element.indeterminate = someVisibleSelected && !allVisibleSelected;
                        }}
                        onChange={onToggleSelectAll}
                        className="card-checkbox"
                      />
                      <span className="checkbox-custom-label">불러온 모든 문의 선택</span>
                    </label>
                  </div>
                  {refreshInterval > 0 && <div className="batch-notice-message active">일괄 처리 중에는 선택 항목 보호를 위해 자동 새로고침이 일시 중지됩니다.</div>}
                </div>

                <div
                  className="batch-workspace-scroll-area"
                  onScroll={(event) => {
                    const target = event.currentTarget;
                    if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) onLoadMore();
                  }}
                >
                  {error && <InlineAlert>{error}</InlineAlert>}
                  <InquiryList inquiries={inquiries} loading={loading} selectedInquiryId={selectedInquiryId} onSelectInquiry={onSelectInquiry} bookmarkedIds={bookmarkedIds} selectedInquiryIds={selectedIds} onToggleSelectInquiry={onToggleSelectInquiry} isBatchSelectionMode indexOffset={batchBaseOffset} />
                  {loadingMore && <div className="batch-list-footer loading"><div className="spinner-small" /><span>추가 문의 불러오는 중...</span></div>}
                  {!loadingMore && hasNext && <button type="button" className="batch-list-footer more" onClick={onLoadMore}><span>스크롤하여 더 보기 ({inquiries.length}개 로드됨)</span></button>}
                  {!loadingMore && !hasNext && inquiries.length > 0 && <div className="batch-list-footer end"><span>모든 문의를 불러왔습니다 (총 {inquiries.length}개)</span></div>}
                </div>

                <div className="batch-workspace-actions-bottom">
                  <div className="batch-action-grid">
                    {(['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`batch-status-btn ${status === 'OPEN' ? 'open' : status === 'IN_PROGRESS' ? 'in-progress' : 'resolved'}`}
                        disabled={selectedCount === 0}
                        onClick={() => onRequestBatchStatus(status)}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="inquiry-scroll-area" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 4px', minHeight: 0, width: '100%' }}>
                {error && <InlineAlert>{error}</InlineAlert>}
                <InquiryList inquiries={inquiries} loading={loading} selectedInquiryId={selectedInquiryId} onSelectInquiry={onSelectInquiry} bookmarkedIds={bookmarkedIds} selectedInquiryIds={selectedIds} onToggleSelectInquiry={onToggleSelectInquiry} isBatchSelectionMode={batchMode} indexOffset={(currentPage - 1) * 20} />
              </div>
            )}

            {!batchMode && inquiries.length > 0 && !loading && (
              <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-light)', width: '100%' }}>
                <Pagination currentPage={currentPage} maxPage={maxAvailablePage} onPageClick={onPageClick} loading={loading} />
              </div>
            )}
          </div>
        )}
      </main>

      <div className={`resize-divider ${resizing ? 'active' : ''}`} onMouseDown={!collapsed ? onResizeStart : undefined} style={{ display: collapsed ? 'none' : undefined }} />
    </>
  );
}
