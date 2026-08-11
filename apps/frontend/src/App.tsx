import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FilterValues } from './components/FilterBar';
import type { CreateTicketInput } from './components/CreateTicketModal';
import { inquiryApi } from './api/inquiryApi';
import type { BatchUpdateInquiryStatusTarget } from './api/inquiryApi';
import type { CustomFilterEntity, CustomerInquiry } from './types/inquiry';
import { NaverLoginRenewPage } from './components/NaverLoginRenewPage';
import { AdminSidebar } from './components/AdminSidebar';
import {
  getVisibleSelectionState,
  retainVisibleSelection,
  toggleSelection,
  toggleVisibleSelection,
} from './features/inquiry/batchSelection';
import { resolveSelectedInquiry } from './features/inquiry/selectedInquiry';
import {
  replaceWithFirstPage,
  resolveRefreshTarget,
  storePage,
  updateCachedItem,
} from './features/inquiry/pageCache';
import type { PageCache } from './features/inquiry/pageCache';
import { parseRefreshInterval } from './features/inquiry/refreshInterval';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { loadInquiryListPage, visibleInquiryIds } from './features/inquiry/inquiryListLoader';
import { useFeedback } from './components/ui/feedbackContext';
import {
  isValidStatusReason,
  MIN_STATUS_REASON_LENGTH,
  toLocalDateInputValue,
} from './features/inquiry/policy';
import { getErrorMessage } from './lib/errors';
import type { BatchStatusModalState } from './components/BatchStatusModal';
import { InquiryWorkspacePane } from './components/InquiryWorkspacePane';
import { useNaverSession } from './hooks/useNaverSession';
import { useInquiryStats } from './hooks/useInquiryStats';
import { useResizableListPane } from './hooks/useResizableListPane';
import { DashboardModals } from './components/DashboardModals';
import { useOperatorSession } from './hooks/useOperatorSession';
import { SelectedInquiryPane } from './components/SelectedInquiryPane';

const MAX_FILTER_BATCH_COUNT = 100;
export const App: React.FC = () => {
  const { notify, requestConfirmation } = useFeedback();
  const isNaverLogin = window.location.pathname === '/naver-login';
  const { operator: currentOperator, switchAccount: handleSwitchAccount } = useOperatorSession({ requestConfirmation });

  const {
    status: naverSessionStatus,
    updatedAt: naverSessionUpdatedAt,
    renewModalOpen: isNaverRenewModalOpen,
    setRenewModalOpen: setIsNaverRenewModalOpen,
    refreshStatus: fetchNaverSessionStatus,
    validate: handleValidateNaverSession,
  } = useNaverSession({ notify });
  const {
    unprocessedCount,
    unprocessedHasMore,
    todayCount,
    todayHasMore,
    missingUserCodeCount,
    missingUserCodeHasMore,
    refresh: fetchStats,
  } = useInquiryStats();
  const {
    width: listWidth,
    collapsed: isListCollapsed,
    resizing: isResizingList,
    setCollapsed: setIsListCollapsed,
    startResizing: startResizingList,
  } = useResizableListPane();

  // Operator (현재 로그인한 관리자) 상태 — Nginx Basic Auth에서 파생
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Query Filter states
  const [queryFilters, setQueryFilters] = useState<FilterValues>({
    userCode: '',
    userCodeMissing: false,
    statuses: [],
    channels: [],
    startDate: '',
    endDate: '',
    isManual: undefined,
    bookmarkedOnly: false,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Data states
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRequestIdRef = useRef(0);

  // Auto-refresh states
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    return parseRefreshInterval(localStorage.getItem('admin_cs_refresh_interval'));
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Batch selection states
  const [isBatchSelectionMode, setIsBatchSelectionMode] = useState(false);
  const [selectedInquiryIds, setSelectedInquiryIds] = useState<Set<string>>(new Set());
  const [batchBaseOffset, setBatchBaseOffset] = useState(0);
  const [pageCache, setPageCache] = useState<PageCache<CustomerInquiry>>({});
  const [batchModal, setBatchModal] = useState<BatchStatusModalState>({
    isOpen: false,
    targetStatus: null,
    isSubmitting: false,
    error: null,
    reason: ''
  });

  // Stats states
  const [totalListCount, setTotalListCount] = useState(0);
  const [totalListHasMore, setTotalListHasMore] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [customFilters, setCustomFilters] = useState<CustomFilterEntity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Keep detail panel open even if selected inquiry disappears from list due to auto-refresh filter mismatch
  const [selectedInquiryDetail, setSelectedInquiryDetail] = useState<CustomerInquiry | null>(null);

  useEffect(() => {
    setSelectedInquiryDetail((previousSelection) => resolveSelectedInquiry(
      selectedInquiryId,
      inquiries,
      Object.values(pageCache).map((page) => page.inquiries),
      previousSelection,
    ));
  }, [selectedInquiryId, inquiries, pageCache]);

  const buildCurrentSearchParams = useCallback((cursorVal?: string | null) => {
    const startISO = queryFilters.startDate
      ? new Date(`${queryFilters.startDate}T00:00:00`).toISOString()
      : undefined;
    const endISO = queryFilters.endDate
      ? new Date(`${queryFilters.endDate}T23:59:59`).toISOString()
      : undefined;

    return {
      userCode: queryFilters.userCode.trim() || undefined,
      userCodeMissing: queryFilters.userCodeMissing || undefined,
      status: queryFilters.statuses.length > 0 ? queryFilters.statuses : undefined,
      channel: queryFilters.channels.length > 0 ? queryFilters.channels : undefined,
      start: startISO,
      end: endISO,
      isManual: queryFilters.isManual,
      bookmarkedOnly: queryFilters.bookmarkedOnly || undefined,
      cursor: cursorVal || undefined,
      sort: sortOrder,
    };
  }, [queryFilters, sortOrder]);

  // Fetch inquiries for the current page and filter conditions
  const fetchPage = useCallback(async (cursorVal: string | null, keepSelection: boolean = false, silent: boolean = false) => {
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    setLoadingMore(false);
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    setSelectedInquiryIds(new Set()); // Reset selection on page/filter change
    setIsBatchSelectionMode(false);
    try {
      const searchParams = buildCurrentSearchParams(cursorVal);

      const result = await loadInquiryListPage(
        inquiryApi,
        searchParams,
        20,
        MAX_FILTER_BATCH_COUNT,
      );
      if (requestId !== listRequestIdRef.current) return;
      const res = result.page;

      setInquiries(res.content);
      setHasNext(res.hasNext);
      setNextCursor(res.nextCursor);

      // Cache Page 1 on initial fetch or when cursorVal is null
      if (!cursorVal) {
        setPageCache(replaceWithFirstPage(res));
        setCurrentPage(1);
        if (!keepSelection) {
          setSelectedInquiryId(null);
        }
      }

      setTotalListCount(result.totalCount);
      setTotalListHasMore(result.totalHasMore);
    } catch (err) {
      if (requestId !== listRequestIdRef.current) return;
      console.error(err);
      setError('데이터를 불러오는 중 문제가 발생했습니다. 백엔드 서버 연결 상태를 확인해 주세요.');
    } finally {
      if (!silent && requestId === listRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [buildCurrentSearchParams]);

  // Refs for tracking loading states to prevent timer hook re-initialization
  const loadingRef = useRef(loading);
  const refreshingRef = useRef(isRefreshing);
  useEffect(() => {
    loadingRef.current = loading;
    refreshingRef.current = isRefreshing;
  }, [loading, isRefreshing]);

  // Refs for tracking page and cache to prevent timer hook re-initialization
  const currentPageRef = useRef(currentPage);
  const pageCacheRef = useRef(pageCache);
  useEffect(() => {
    currentPageRef.current = currentPage;
    pageCacheRef.current = pageCache;
  }, [currentPage, pageCache]);

  // Unified refresh handler
  const handleRefresh = useCallback(async (silent: boolean = false) => {
    if (loadingRef.current || refreshingRef.current) return;
    setIsRefreshing(true);
    try {
      const promises: Promise<unknown>[] = [
        fetchStats(),
        fetchNaverSessionStatus(),
      ];

      const refreshPages = async () => {
        const requestId = listRequestIdRef.current + 1;
        listRequestIdRef.current = requestId;
        setLoadingMore(false);
        if (!silent) {
          setLoading(true);
        }
        setError(null);
        try {
          const refreshTarget = resolveRefreshTarget(currentPageRef.current, pageCacheRef.current);

          const searchParams = buildCurrentSearchParams(refreshTarget.cursor);
          const result = await loadInquiryListPage(
            inquiryApi,
            searchParams,
            20,
            MAX_FILTER_BATCH_COUNT,
          );
          if (requestId !== listRequestIdRef.current) return;
          const res = result.page;

          // 캐시의 해당 페이지 정보 업데이트
          setPageCache((prev) => storePage(prev, refreshTarget.page, res));

          // 현재 페이지 설정
          setCurrentPage(refreshTarget.page);

          // 현재 리스트에 보여줄 상태들 업데이트
          setInquiries(res.content);
          setHasNext(res.hasNext);
          setNextCursor(res.nextCursor);

          // 현재 페이지에서 사라진 아이템은 selectedInquiryIds에서 제거 (유효한 선택 유지)
          setSelectedInquiryIds((prev) => retainVisibleSelection(
            prev,
            visibleInquiryIds(res.content),
          ));

          setTotalListCount(result.totalCount);
          setTotalListHasMore(result.totalHasMore);
        } catch (err) {
          if (requestId !== listRequestIdRef.current) return;
          console.error(err);
          setError('데이터를 새로고침하는 중 문제가 발생했습니다.');
        } finally {
          if (!silent && requestId === listRequestIdRef.current) {
            setLoading(false);
          }
        }
      };

      await Promise.all([
        ...promises,
        refreshPages()
      ]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchStats, fetchNaverSessionStatus, buildCurrentSearchParams]);

  const handleAutoRefresh = useCallback(() => handleRefresh(true), [handleRefresh]);
  useAutoRefresh({
    intervalSeconds: refreshInterval,
    paused: isBatchSelectionMode,
    onRefresh: handleAutoRefresh,
  });

  const handleManualRefresh = useCallback(async () => {
    if (isBatchSelectionMode && selectedInquiryIds.size > 0) {
      const shouldRefresh = await requestConfirmation({
        title: '선택 항목 초기화',
        message: '일괄 처리 중 새로고침하면 선택 항목이 초기화됩니다. 계속하시겠습니까?',
        confirmLabel: '초기화 후 새로고침',
      });
      if (!shouldRefresh) return;

      setSelectedInquiryIds(new Set());
      setIsBatchSelectionMode(false);
    }

    handleRefresh(false);
  }, [handleRefresh, isBatchSelectionMode, requestConfirmation, selectedInquiryIds.size]);

  const loadMoreBatchInquiries = useCallback(async () => {
    if (loading || loadingMore || !hasNext || !nextCursor) return;
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    setLoadingMore(true);
    try {
      const searchParams = buildCurrentSearchParams(nextCursor);
      const res = await inquiryApi.searchInquiries({
        ...searchParams,
        size: 20,
      });
      if (requestId !== listRequestIdRef.current) return;

      setInquiries((prev) => {
        const existingIds = new Set(prev.map(inq => inq.id));
        const newItems = res.content.filter(inq => !existingIds.has(inq.id));
        return [...prev, ...newItems];
      });
      setHasNext(res.hasNext);
      setNextCursor(res.nextCursor);
      setCurrentPage((prev) => prev + 1);
    } catch (err) {
      if (requestId !== listRequestIdRef.current) return;
      console.error(err);
      setError('추가 문의를 불러오는 중 문제가 발생했습니다.');
    } finally {
      if (requestId === listRequestIdRef.current) setLoadingMore(false);
    }
  }, [loading, loadingMore, hasNext, nextCursor, buildCurrentSearchParams]);

  const fetchBookmarks = useCallback(async () => {
    try {
      const ids = await inquiryApi.getBookmarks();
      setBookmarkedIds(new Set(ids));
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    }
  }, []);

  const fetchCustomFilters = useCallback(async () => {
    try {
      const filters = await inquiryApi.getCustomFilters();
      setCustomFilters(filters);
    } catch (err) {
      console.error('Failed to fetch custom filters:', err);
    }
  }, []);

  // Load inquiries when filters or sort order change, or page index changes
  useEffect(() => {
    // Reset page to Page 1 when search filters or sort order change
    setCurrentPage(1);
    fetchPage(null);
  }, [queryFilters, sortOrder, fetchPage]);

  // Auto-select first item when inquiries list loads or changes
  useEffect(() => {
    if (inquiries.length > 0) {
      if (!selectedInquiryId) {
        setSelectedInquiryId(inquiries[0].id);
      }
    } else {
      setSelectedInquiryId(null);
    }
  }, [inquiries, selectedInquiryId]);

  useEffect(() => {
    if (!currentOperator) return;
    Promise.resolve().then(() => Promise.all([fetchBookmarks(), fetchCustomFilters()]));
  }, [currentOperator, fetchBookmarks, fetchCustomFilters]);


  // Pagination Handlers
  const handleNextPage = useCallback(async () => {
    if (hasNext && nextCursor) {
      const targetPage = currentPage + 1;
      
      // If Page is already cached
      if (pageCache[targetPage]) {
        const cacheEntry = pageCache[targetPage];
        setInquiries(cacheEntry.inquiries);
        setHasNext(cacheEntry.hasNext);
        setNextCursor(cacheEntry.nextCursor);
        setCurrentPage(targetPage);
        return;
      }

      // If not cached, fetch from API
      const requestId = listRequestIdRef.current + 1;
      listRequestIdRef.current = requestId;
      setLoadingMore(false);
      setLoading(true);
      setError(null);
      try {
        const searchParams = buildCurrentSearchParams(nextCursor);
        const res = await inquiryApi.searchInquiries({
          ...searchParams,
          size: 20,
        });
        if (requestId !== listRequestIdRef.current) return;

        // Cache the newly fetched page
        setPageCache((prev) => storePage(prev, targetPage, res));

        // Set inquiries for the target page
        setInquiries(res.content);
        setHasNext(res.hasNext);
        setNextCursor(res.nextCursor);
        setCurrentPage(targetPage);
      } catch (err) {
        if (requestId !== listRequestIdRef.current) return;
        console.error(err);
        setError('데이터를 불러오는 중 문제가 발생했습니다.');
      } finally {
        if (requestId === listRequestIdRef.current) setLoading(false);
      }
    }
  }, [hasNext, nextCursor, currentPage, pageCache, buildCurrentSearchParams]);

  const handlePageClick = useCallback(async (p: number) => {
    if (p === currentPage || p < 1) return;

    if (pageCache[p]) {
      const cacheEntry = pageCache[p];
      setInquiries(cacheEntry.inquiries);
      setHasNext(cacheEntry.hasNext);
      setNextCursor(cacheEntry.nextCursor);
      setCurrentPage(p);
    } else {
      if (p === currentPage + 1 && hasNext && nextCursor) {
        handleNextPage();
      }
    }
  }, [currentPage, pageCache, hasNext, nextCursor, handleNextPage]);

  const handleUpdateInquiry = useCallback((id: string, updatedFields: Partial<CustomerInquiry>) => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, ...updatedFields } : inq))
    );
    setPageCache((prev) => updateCachedItem(prev, id, updatedFields));
    fetchStats();
  }, [fetchStats]);

  // Batch Selection Handlers
  const handleStartBatchSelection = useCallback(() => {
    setIsBatchSelectionMode(true);
    setBatchBaseOffset((currentPage - 1) * 20);
  }, [currentPage]);

  const handleCancelBatchSelection = useCallback(() => {
    setSelectedInquiryIds(new Set());
    setIsBatchSelectionMode(false);
  }, []);

  const handleToggleSelectInquiry = useCallback((id: string, checked: boolean) => {
    setSelectedInquiryIds((prev) => toggleSelection(prev, id, checked));
  }, []);

  const handleToggleSelectAll = () => {
    setSelectedInquiryIds((prev) => toggleVisibleSelection(
      prev,
      inquiries.map((inquiry) => inquiry.id),
    ));
  };

  const handleExecuteBatchStatusUpdate = async () => {
    const selectedBatchCount = selectedInquiryIds.size;
    if (selectedBatchCount === 0 || !batchModal.targetStatus) return;
    if (!isValidStatusReason(batchModal.reason)) {
      setBatchModal((prev) => ({
        ...prev,
        error: `상태 변경 사유를 최소 ${MIN_STATUS_REASON_LENGTH}자 이상 입력해 주세요.`
      }));
      return;
    }

    setBatchModal((prev) => ({ ...prev, isSubmitting: true, error: null }));
    try {
      const target: BatchUpdateInquiryStatusTarget = {
        mode: 'IDS',
        inquiryIds: Array.from(selectedInquiryIds),
      };
      await inquiryApi.updateInquiryStatuses(target, batchModal.targetStatus, batchModal.reason.trim());

      // Successfully updated! Refresh starting from Page 1 to clear obsolete cache
      await fetchPage(null);

      // Refresh Stats
      await fetchStats();

      // Update detail view if selected inquiry was updated
      if (selectedInquiryId && selectedInquiryIds.has(selectedInquiryId)) {
        handleUpdateInquiry(selectedInquiryId, { status: batchModal.targetStatus });
      }

      // Reset modal and selection
      setBatchModal({
        isOpen: false,
        targetStatus: null,
        isSubmitting: false,
        error: null,
        reason: ''
      });
      setSelectedInquiryIds(new Set());
      setIsBatchSelectionMode(false);
    } catch (err) {
      console.error(err);
      setBatchModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: '상태 일괄 변경 중 오류가 발생했습니다: ' + getErrorMessage(err)
      }));
    }
  };

  const handleCreateTicket = async (ticketData: CreateTicketInput) => {
    try {
      await inquiryApi.createInquiry({
        channel: ticketData.channel,
        userCode: ticketData.userCode || undefined,
        content: ticketData.content,
        channelMetadata: ticketData.channelMetadata,
        imageUrls: ticketData.imageUrls,
      });
      await Promise.all([fetchStats(), fetchPage(null)]);
      notify('CS 티켓을 생성했습니다.', 'success');
    } catch (err) {
      console.error(err);
      throw new Error('티켓 생성에 실패했습니다: ' + getErrorMessage(err), { cause: err });
    }
  };

  const handleUnprocessedStatsClick = () => {
    setQueryFilters({
      userCode: '',
      userCodeMissing: false,
      statuses: ['OPEN'],
      channels: [],
      startDate: '',
      endDate: '',
      isManual: undefined,
      bookmarkedOnly: false,
    });
  };

  const handleTodayStatsClick = () => {
    const today = toLocalDateInputValue(new Date());
    setQueryFilters({
      userCode: '',
      userCodeMissing: false,
      statuses: ['OPEN'],
      channels: [],
      startDate: today,
      endDate: today,
      isManual: undefined,
      bookmarkedOnly: false,
    });
  };

  const handleBookmarkedStatsClick = () => {
    setQueryFilters({
      userCode: '',
      userCodeMissing: false,
      statuses: [],
      channels: [],
      startDate: '',
      endDate: '',
      isManual: undefined,
      bookmarkedOnly: true,
    });
  };

  const handleMissingUserCodeStatsClick = () => {
    setQueryFilters({
      userCode: '',
      userCodeMissing: true,
      statuses: [],
      channels: [],
      startDate: '',
      endDate: '',
      isManual: undefined,
      bookmarkedOnly: false,
    });
  };

  const handleToggleBookmark = async (inquiryId: string) => {
    const wasBookmarked = bookmarkedIds.has(inquiryId);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (wasBookmarked) {
        next.delete(inquiryId);
      } else {
        next.add(inquiryId);
      }
      return next;
    });

    try {
      if (wasBookmarked) {
        await inquiryApi.removeBookmark(inquiryId);
      } else {
        await inquiryApi.addBookmark(inquiryId);
      }
      if (queryFilters.bookmarkedOnly && wasBookmarked) {
        fetchPage(null);
      }
    } catch (err) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) {
          next.add(inquiryId);
        } else {
          next.delete(inquiryId);
        }
        return next;
      });
      notify('즐겨찾기 변경에 실패했습니다: ' + getErrorMessage(err), 'error');
    }
  };

  const handleSaveCustomFilter = async (name: string, values: FilterValues) => {
    await inquiryApi.saveCustomFilter(name, values);
    await fetchCustomFilters();
  };

  const handleDeleteCustomFilter = async (id: number) => {
    await inquiryApi.deleteCustomFilter(id);
    await fetchCustomFilters();
  };

  const selectedInquiry = selectedInquiryDetail || undefined;
  const effectiveVisibleSelectedIds = selectedInquiryIds;
  const selectedBatchCount = selectedInquiryIds.size;
  const {
    allSelected: allVisibleSelected,
    someSelected: someVisibleSelected,
  } = getVisibleSelectionState(
    selectedInquiryIds,
    inquiries.map((inquiry) => inquiry.id),
  );

  if (isNaverLogin) {
    return <NaverLoginRenewPage />;
  }

  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>
      <AdminSidebar
        operator={currentOperator}
        naverSessionStatus={naverSessionStatus}
        naverSessionUpdatedAt={naverSessionUpdatedAt}
        customFilters={customFilters}
        stats={{
          unprocessedCount,
          unprocessedHasMore,
          todayCount,
          todayHasMore,
          missingUserCodeCount,
          missingUserCodeHasMore,
          bookmarkedCount: bookmarkedIds.size,
        }}
        onValidateNaverSession={handleValidateNaverSession}
        onRenewNaverSession={() => setIsNaverRenewModalOpen(true)}
        onManageAccounts={() => setIsAccountModalOpen(true)}
        onSwitchAccount={handleSwitchAccount}
        onApplyFilter={setQueryFilters}
        onShowUnprocessed={handleUnprocessedStatsClick}
        onShowToday={handleTodayStatsClick}
        onShowMissingUserCode={handleMissingUserCodeStatsClick}
        onShowBookmarks={handleBookmarkedStatsClick}
        onCreateTicket={() => setIsModalOpen(true)}
      />

      <InquiryWorkspacePane
        width={listWidth}
        collapsed={isListCollapsed}
        resizing={isResizingList}
        totalCount={totalListCount}
        totalHasMore={totalListHasMore}
        loading={loading}
        refreshing={isRefreshing}
        loadingMore={loadingMore}
        error={error}
        refreshInterval={refreshInterval}
        sortOrder={sortOrder}
        inquiries={inquiries}
        selectedInquiryId={selectedInquiryId}
        bookmarkedIds={bookmarkedIds}
        batchMode={isBatchSelectionMode}
        selectedIds={effectiveVisibleSelectedIds}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        batchBaseOffset={batchBaseOffset}
        hasNext={hasNext}
        currentPage={currentPage}
        pageCache={pageCache}
        filters={queryFilters}
        customFilters={customFilters}
        onCollapseChange={setIsListCollapsed}
        onResizeStart={startResizingList}
        onManualRefresh={handleManualRefresh}
        onRefreshIntervalChange={(value) => {
          setRefreshInterval(value);
          localStorage.setItem('admin_cs_refresh_interval', String(value));
        }}
        onSortOrderChange={() => setSortOrder((previous) => previous === 'desc' ? 'asc' : 'desc')}
        onBatchModeStart={handleStartBatchSelection}
        onBatchModeCancel={handleCancelBatchSelection}
        onToggleSelectAll={handleToggleSelectAll}
        onLoadMore={loadMoreBatchInquiries}
        onSelectInquiry={setSelectedInquiryId}
        onToggleSelectInquiry={handleToggleSelectInquiry}
        onRequestBatchStatus={(targetStatus) => setBatchModal({
          isOpen: true,
          targetStatus,
          isSubmitting: false,
          error: null,
          reason: '',
        })}
        onPageClick={handlePageClick}
        onFilterChange={setQueryFilters}
        onSaveCustomFilter={handleSaveCustomFilter}
        onDeleteCustomFilter={handleDeleteCustomFilter}
      />
      <SelectedInquiryPane
        inquiry={selectedInquiry}
        operator={currentOperator}
        bookmarked={selectedInquiry ? bookmarkedIds.has(selectedInquiry.id) : false}
        onUpdateInquiry={handleUpdateInquiry}
        onToggleBookmark={handleToggleBookmark}
        onRequireNaverSessionRenew={() => setIsNaverRenewModalOpen(true)}
      />


      <DashboardModals
        createTicketOpen={isModalOpen}
        accountManagementOpen={isAccountModalOpen}
        naverRenewOpen={isNaverRenewModalOpen}
        operator={currentOperator}
        batchModal={batchModal}
        selectedBatchCount={selectedBatchCount}
        onCreateTicketClose={() => setIsModalOpen(false)}
        onCreateTicket={handleCreateTicket}
        onAccountManagementClose={() => setIsAccountModalOpen(false)}
        onNaverRenewClose={() => {
          setIsNaverRenewModalOpen(false);
          void fetchNaverSessionStatus();
        }}
        onBatchModalChange={setBatchModal}
        onBatchConfirm={handleExecuteBatchStatusUpdate}
      />

    </div>
  );
};

export default App;
