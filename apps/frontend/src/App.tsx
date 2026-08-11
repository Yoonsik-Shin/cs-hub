import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FilterBar } from './components/FilterBar';
import type { FilterValues } from './components/FilterBar';
import { InquiryList } from './components/InquiryList';
import { Pagination } from './components/Pagination';
import { CreateTicketModal } from './components/CreateTicketModal';
import type { CreateTicketInput } from './components/CreateTicketModal';
import { inquiryApi } from './api/inquiryApi';
import type { BatchUpdateInquiryStatusTarget } from './api/inquiryApi';
import type { CustomFilterEntity, CustomerInquiry, OperatorInfo } from './types/inquiry';
import { RefreshCw, ChevronLeft, ChevronRight, ListChecks, ArrowUp, ArrowDown } from 'lucide-react';
import { NaverLoginRenewPage } from './components/NaverLoginRenewPage';
import { InquiryDetailPanel } from './components/InquiryDetailPanel';
import { AccountManagementModal } from './components/AccountManagementModal';
import type { NaverSessionStatus } from './components/NaverSessionWidget';
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
  getStatusLabel,
  isValidStatusReason,
  MIN_STATUS_REASON_LENGTH,
  toLocalDateInputValue,
} from './features/inquiry/policy';
import { getErrorMessage } from './lib/errors';
import { BatchStatusModal } from './components/BatchStatusModal';
import type { BatchStatusModalState } from './components/BatchStatusModal';
import { InlineAlert } from './components/ui/InlineAlert';

const MAX_FILTER_BATCH_COUNT = 100;
export const App: React.FC = () => {
  const { notify, requestConfirmation } = useFeedback();
  const isNaverLogin = window.location.pathname === '/naver-login';

  // Operator (현재 로그인한 관리자) 상태 — Nginx Basic Auth에서 파생
  const [currentOperator, setCurrentOperator] = useState<OperatorInfo | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const adminAccessIssuedOriginRef = useRef<string | null>(null);

  // Naver Session states
  const [naverSessionStatus, setNaverSessionStatus] = useState<NaverSessionStatus>('CHECKING');
  const [naverSessionUpdatedAt, setNaverSessionUpdatedAt] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [isNaverRenewModalOpen, setIsNaverRenewModalOpen] = useState(false);

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
  const [unprocessedCount, setUnprocessedCount] = useState(0);
  const [unprocessedHasMore, setUnprocessedHasMore] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [todayHasMore, setTodayHasMore] = useState(false);
  const [missingUserCodeCount, setMissingUserCodeCount] = useState(0);
  const [missingUserCodeHasMore, setMissingUserCodeHasMore] = useState(false);
  const [totalListCount, setTotalListCount] = useState(0);
  const [totalListHasMore, setTotalListHasMore] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [customFilters, setCustomFilters] = useState<CustomFilterEntity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Resizable & Collapsible columns states
  const [listWidth, setListWidth] = useState(300);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [isResizingList, setIsResizingList] = useState(false);

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

  const startResizingList = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizingList(true);
    const startX = mouseDownEvent.clientX;
    const startWidth = listWidth;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const deltaX = mouseMoveEvent.clientX - startX;
      const newWidth = Math.max(300, Math.min(700, startWidth + deltaX));
      setListWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingList(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Fetch stats (unprocessed count and today's new count)
  const fetchStats = useCallback(async () => {
    try {
      // 1. Fetch unprocessed count (status: OPEN)
      const openRes = await inquiryApi.countInquiries({ status: 'OPEN', limit: 100 });
      setUnprocessedCount(openRes.count);
      setUnprocessedHasMore(openRes.hasMore);

      // 2. Fetch today's unprocessed count (createdAt >= start of today in KST/local)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today.toISOString();
      const todayRes = await inquiryApi.countInquiries({ status: 'OPEN', start: startOfToday, limit: 100 });
      setTodayCount(todayRes.count);
      setTodayHasMore(todayRes.hasMore);

      const missingUserCodeRes = await inquiryApi.countInquiries({ userCodeMissing: true, limit: 100 });
      setMissingUserCodeCount(missingUserCodeRes.count);
      setMissingUserCodeHasMore(missingUserCodeRes.hasMore);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch Naver Cafe Session Status
  const fetchNaverSessionStatus = useCallback(async () => {
    try {
      const statusRes = await inquiryApi.getNaverSessionStatus();
      setNaverSessionStatus(statusRes.status);
      setNaverSessionUpdatedAt(statusRes.updatedAt);
    } catch (err) {
      console.error('Failed to fetch Naver session status:', err);
      setNaverSessionStatus('ERROR');
    }
  }, []);

  // Sync Naver Cafe Session in Real-time
  const handleValidateNaverSession = async () => {
    if (verifyingSession) return;
    setVerifyingSession(true);
    setNaverSessionStatus('CHECKING');
    try {
      const result = await inquiryApi.syncNaverSessionStatus();
      setNaverSessionStatus(result.status);
      setNaverSessionUpdatedAt(result.updatedAt);
      if (result.valid) {
        notify('네이버 카페 세션이 정상입니다.', 'success');
      } else {
        setIsNaverRenewModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to sync Naver session:', err);
      notify('네이버 카페 세션을 확인하지 못했습니다. 브라우저 워커 연결 상태를 확인해 주세요.', 'error');
      setNaverSessionStatus('ERROR');
    } finally {
      setVerifyingSession(false);
    }
  };

  const handleSwitchAccount = async () => {
    const currentUserId = currentOperator?.id || '';
    const confirmed = await requestConfirmation({
      title: '로그인 계정 변경',
      message: '현재 계정에서 로그아웃하고 다른 계정으로 로그인하시겠습니까?',
      confirmLabel: '계정 변경',
    });
    if (confirmed) {
      window.location.href = `/api/v1/auth/logout?current=${encodeURIComponent(currentUserId)}`;
    }
  };

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

  // 앱 마운트 시 현재 로그인 계정 정보 조회 (Nginx X-Remote-User 기반)
  useEffect(() => {
    inquiryApi.getMe()
      .then((operator) => {
        setCurrentOperator(operator);
        if (operator.role === 'ADMIN' && adminAccessIssuedOriginRef.current !== window.location.origin) {
          adminAccessIssuedOriginRef.current = window.location.origin;
          inquiryApi.issueAdminAccess().catch((err) => {
            adminAccessIssuedOriginRef.current = null;
            console.warn('Failed to refresh admin tool access for current origin:', err);
          });
        }
        fetchBookmarks();
        fetchCustomFilters();
      })
      .catch((err) => {
        console.warn('관리자 계정 정보를 불러오지 못했습니다 (fallback 사용):', err);
        setCurrentOperator({ id: 'unknown', nickname: '알 수 없음', email: '', role: 'OPERATOR' });
      });
  }, [fetchBookmarks, fetchCustomFilters]);

  // Load stats and Naver session status periodically and on mount
  useEffect(() => {
    fetchStats();
    fetchNaverSessionStatus();
  }, [fetchStats, fetchNaverSessionStatus]);

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

      {/* Middle Inquiry List */}
      <main
        className="dashboard-main-content"
        style={{
          width: isListCollapsed ? '56px' : `${listWidth}px`,
          minWidth: isListCollapsed ? '56px' : undefined,
          padding: isListCollapsed ? '20px 0' : '20px 8px 8px 8px',
          alignItems: isListCollapsed ? 'center' : undefined,
          overflow: 'hidden',
          transition: isResizingList ? 'none' : 'width 0.2s ease',
          position: 'relative'
        }}
      >
        {isListCollapsed ? (
          /* ── Collapsed List Column ── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', width: '100%', padding: '12px 0', gap: '0' }}>
            {/* Expand Button — top */}
            <button
              type="button"
              onClick={() => setIsListCollapsed(false)}
              title="목록 펼치기"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', width: '40px', flexShrink: 0 }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <ChevronRight size={18} />
            </button>

            {/* Vertical Label — vertically centered in remaining space */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                userSelect: 'none'
              }}>
                문의 목록
              </span>
            </div>

            {/* Count Badge — bottom */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--accent-indigo)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: totalListHasMore ? '10px' : '11px',
                fontWeight: '700',
                flexShrink: 0
              }}
              title={`필터된 문의 수: ${totalListHasMore ? '100개 이상' : `${totalListCount}개`}`}
            >
              {totalListHasMore ? `${totalListCount}+` : totalListCount}
            </div>
          </div>

        ) : (
          /* ── Expanded List Column ── */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '12px', overflow: 'hidden' }}>
            {/* Header Row: Title & Count & Collapse button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, width: '100%', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>문의 목록</span>
                <span style={{ 
                  background: 'rgba(99, 102, 241, 0.08)', 
                  color: 'var(--accent-indigo)', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  fontWeight: '700' 
                }}>
                  {totalListHasMore ? `${totalListCount}+` : totalListCount}
                </span>
              </div>
              <div className="list-header-actions">
                {/* Auto Refresh Controls */}
                <div className="auto-refresh-container">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    className="auto-refresh-btn action-tooltip"
                    data-tooltip={isBatchSelectionMode && selectedBatchCount > 0 ? '선택 항목 초기화 후 새로고침' : '즉시 새로고침'}
                    disabled={loading || isRefreshing}
                  >
                    <RefreshCw size={12} className={isRefreshing ? 'spin' : ''} />
                  </button>
                  <div className="auto-refresh-divider" />
                  <div className="action-tooltip" data-tooltip="자동 새로고침 주기" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <select
                      value={refreshInterval}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRefreshInterval(val);
                        localStorage.setItem('admin_cs_refresh_interval', String(val));
                      }}
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

                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="auto-refresh-btn action-tooltip"
                  data-tooltip={sortOrder === 'desc' ? '최신순 (클릭 시 오래된순)' : '오래된순 (클릭 시 최신순)'}
                >
                  {sortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                </button>

                {inquiries.length > 0 && !loading && (
                  <button
                    type="button"
                    className={`batch-mode-btn action-tooltip tooltip-left${isBatchSelectionMode ? ' active' : ''}`}
                    onClick={isBatchSelectionMode ? handleCancelBatchSelection : handleStartBatchSelection}
                    data-tooltip={isBatchSelectionMode ? "선택 종료" : "배치 처리 (일괄 상태 변경)"}
                  >
                    <ListChecks size={14} />
                    <span>배치 처리</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsListCollapsed(true)}
                  className="action-tooltip tooltip-left"
                  data-tooltip="목록 접기"
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--text-muted)', 
                    cursor: 'pointer', 
                    padding: '4px', 
                    borderRadius: '4px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>

            {/* Filter Bar Component Container */}
            <div style={{ flexShrink: 0, width: '100%', padding: '0 4px' }}>
              <FilterBar
                initialValues={queryFilters}
                onSearch={setQueryFilters}
                customFilters={customFilters}
                onSaveCustomFilter={handleSaveCustomFilter}
                onDeleteCustomFilter={handleDeleteCustomFilter}
              />
            </div>

            {/* Scrollable list area — flex:1 so it fills remaining height */}
            {isBatchSelectionMode && inquiries.length > 0 && !loading ? (
              <div className="batch-workspace-container">
                <div className="batch-workspace-controls-top">
                  <div className="batch-control-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="batch-workspace-title">일괄 처리 모드</span>
                      <span className="batch-selection-badge">
                        {selectedBatchCount}개 선택됨
                      </span>
                    </div>
                    <button
                      type="button"
                      className="batch-btn-cancel-top"
                      onClick={handleCancelBatchSelection}
                    >
                      선택 종료
                    </button>
                  </div>

                  <div className="batch-scope-selectors">
                    <label className="batch-scope-checkbox-wrapper" style={{ width: '100%' }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someVisibleSelected && !allVisibleSelected;
                          }
                        }}
                        onChange={handleToggleSelectAll}
                        className="card-checkbox"
                      />
                      <span className="checkbox-custom-label">불러온 모든 문의 선택</span>
                    </label>
                  </div>

                  {refreshInterval > 0 && (
                    <div className="batch-notice-message active">
                      일괄 처리 중에는 선택 항목 보호를 위해 자동 새로고침이 일시 중지됩니다.
                    </div>
                  )}
                </div>

                <div 
                  className="batch-workspace-scroll-area"
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
                      loadMoreBatchInquiries();
                    }
                  }}
                >
                  {error && <InlineAlert>{error}</InlineAlert>}

                  <InquiryList
                    inquiries={inquiries}
                    loading={loading}
                    selectedInquiryId={selectedInquiryId}
                    onSelectInquiry={setSelectedInquiryId}
                    bookmarkedIds={bookmarkedIds}
                    selectedInquiryIds={effectiveVisibleSelectedIds}
                    onToggleSelectInquiry={handleToggleSelectInquiry}
                    isBatchSelectionMode={isBatchSelectionMode}
                    indexOffset={batchBaseOffset}
                  />

                  {loadingMore && (
                    <div className="batch-list-footer loading">
                      <div className="spinner-small" />
                      <span>추가 문의 불러오는 중...</span>
                    </div>
                  )}

                  {!loadingMore && hasNext && (
                    <div className="batch-list-footer more" onClick={loadMoreBatchInquiries}>
                      <span>스크롤하여 더 보기 ({inquiries.length}개 로드됨)</span>
                    </div>
                  )}

                  {!loadingMore && !hasNext && inquiries.length > 0 && (
                    <div className="batch-list-footer end">
                      <span>모든 문의를 불러왔습니다 (총 {inquiries.length}개)</span>
                    </div>
                  )}
                </div>

                <div className="batch-workspace-actions-bottom">
                  <div className="batch-action-grid">
                    <button
                      type="button"
                      className="batch-status-btn open"
                      disabled={selectedBatchCount === 0}
                      onClick={() => setBatchModal({ isOpen: true, targetStatus: 'OPEN', isSubmitting: false, error: null, reason: '' })}
                    >
                      {getStatusLabel('OPEN')}
                    </button>
                    <button
                      type="button"
                      className="batch-status-btn in-progress"
                      disabled={selectedBatchCount === 0}
                      onClick={() => setBatchModal({ isOpen: true, targetStatus: 'IN_PROGRESS', isSubmitting: false, error: null, reason: '' })}
                    >
                      {getStatusLabel('IN_PROGRESS')}
                    </button>
                    <button
                      type="button"
                      className="batch-status-btn resolved"
                      disabled={selectedBatchCount === 0}
                      onClick={() => setBatchModal({ isOpen: true, targetStatus: 'RESOLVED', isSubmitting: false, error: null, reason: '' })}
                    >
                      {getStatusLabel('RESOLVED')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="inquiry-scroll-area" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 4px 6px 4px', minHeight: 0, width: '100%' }}>
                {error && <InlineAlert>{error}</InlineAlert>}

                <InquiryList
                  inquiries={inquiries}
                  loading={loading}
                  selectedInquiryId={selectedInquiryId}
                  onSelectInquiry={setSelectedInquiryId}
                  bookmarkedIds={bookmarkedIds}
                  selectedInquiryIds={effectiveVisibleSelectedIds}
                  onToggleSelectInquiry={handleToggleSelectInquiry}
                  isBatchSelectionMode={isBatchSelectionMode}
                  indexOffset={(currentPage - 1) * 20}
                />
              </div>
            )}

            {/* Pagination Controls — always at the bottom, never scrolls */}
            {!isBatchSelectionMode && inquiries.length > 0 && !loading && (() => {
              const loadedPages = Object.keys(pageCache).map(Number);
              const maxLoadedPage = loadedPages.length > 0 ? Math.max(...loadedPages) : 1;
              const hasNextFromMax = pageCache[maxLoadedPage]?.hasNext ?? hasNext;
              const maxAvailablePage = hasNextFromMax ? maxLoadedPage + 1 : maxLoadedPage;

              return (
                <div style={{ flexShrink: 0, paddingTop: '0px', borderTop: '1px solid var(--border-light)', width: '100%' }}>
                  <Pagination
                    currentPage={currentPage}
                    maxPage={maxAvailablePage}
                    onPageClick={handlePageClick}
                    loading={loading}
                  />
                </div>
              );
            })()}

          </div>
        )}
      </main>

      {/* Resize Divider 2 */}
      <div
        className={`resize-divider ${isResizingList ? 'active' : ''}`}
        onMouseDown={!isListCollapsed ? startResizingList : undefined}
        style={{ display: isListCollapsed ? 'none' : undefined }}
      />

      {/* Right Detail Pane */}
      <section
        className="dashboard-detail-pane"
      >
        {selectedInquiry ? (
          <InquiryDetailPanel
            key={selectedInquiry.id}
            inquiry={selectedInquiry}
            operator={currentOperator}
            onUpdateInquiry={handleUpdateInquiry}
            isBookmarked={bookmarkedIds.has(selectedInquiry.id)}
            onToggleBookmark={handleToggleBookmark}
            onRequireNaverSessionRenew={() => setIsNaverRenewModalOpen(true)}
          />
        ) : (
          <div
            className="detail-pane-placeholder"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-secondary)',
              gap: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              padding: '40px',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '48px' }}>🔍</span>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 600 }}>선택된 문의가 없습니다</h3>
            <p style={{ fontSize: '14px', maxWidth: '320px' }}>목록에서 문의 건을 클릭하시면 상세한 내용과 실시간 처리 콘솔이 노출됩니다.</p>
          </div>
        )}
      </section>

      {/* Ticket Manual Creation Modal */}
      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTicket}
      />

      {/* Account Management Modal (ADMIN only) */}
      {isAccountModalOpen && (
        <AccountManagementModal
          onClose={() => setIsAccountModalOpen(false)}
          currentUsername={currentOperator?.id || ''}
        />
      )}

      <BatchStatusModal modal={batchModal} selectedCount={selectedBatchCount} onChange={setBatchModal} onConfirm={handleExecuteBatchStatusUpdate} />

      {/* Naver Session Renew Modal */}
      {isNaverRenewModalOpen && createPortal(
        <NaverLoginRenewPage
          isModal
          onClose={() => {
            setIsNaverRenewModalOpen(false);
            fetchNaverSessionStatus();
          }}
        />,
        document.body
      )}
    </div>
  );
};

export default App;
