import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FilterBar } from './components/FilterBar';
import type { FilterValues } from './components/FilterBar';
import { InquiryList } from './components/InquiryList';
import { Pagination } from './components/Pagination';
import { CreateTicketModal } from './components/CreateTicketModal';
import type { CreateTicketInput } from './components/CreateTicketModal';
import { inquiryApi } from './api/inquiryApi';
import type { BatchUpdateInquiryStatusTarget, OperatorInfo } from './api/inquiryApi';
import type { CustomFilterEntity, CustomerInquiry, InquiryStatus } from './types/inquiry';
import { RefreshCw, ChevronLeft, ChevronRight, X, ListChecks, ArrowUp, ArrowDown } from 'lucide-react';
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

const MAX_FILTER_BATCH_COUNT = 100;
type BatchSelectionScope = 'PAGE' | 'FILTER';

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : '알 수 없는 오류'
);

export const App: React.FC = () => {
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

  // Auto-refresh states
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    return parseRefreshInterval(localStorage.getItem('admin_cs_refresh_interval'));
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Batch selection states
  const [isBatchSelectionMode, setIsBatchSelectionMode] = useState(false);
  const [batchSelectionScope, setBatchSelectionScope] = useState<BatchSelectionScope>('PAGE');
  const [selectedInquiryIds, setSelectedInquiryIds] = useState<Set<string>>(new Set());
  const [batchBaseOffset, setBatchBaseOffset] = useState(0);
  const [pageCache, setPageCache] = useState<PageCache<CustomerInquiry>>({});
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [batchModal, setBatchModal] = useState<{
    isOpen: boolean;
    targetStatus: InquiryStatus | null;
    isSubmitting: boolean;
    error: string | null;
    reason: string;
  }>({
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
        alert('네이버 카페 세션이 유효합니다 (정상).');
      } else {
        setIsNaverRenewModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to sync Naver session:', err);
      alert('네이버 카페 세션 상태 동기화 중 에러가 발생했습니다. 브라우저 워커 연결 상태를 확인해 주세요.');
      setNaverSessionStatus('ERROR');
    } finally {
      setVerifyingSession(false);
    }
  };

  const handleSwitchAccount = () => {
    const currentUserId = currentOperator?.id || '';
    if (window.confirm("현재 로그인된 Nginx Basic Auth 계정을 변경(로그아웃)하시겠습니까?\n\n[확인]을 누르면 계정 변경을 위한 로그인 창이 다시 표시됩니다.")) {
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
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    setSelectedInquiryIds(new Set()); // Reset selection on page/filter change
    setBatchSelectionScope('PAGE');
    setBatchNotice(null);
    setIsBatchSelectionMode(false);
    try {
      const searchParams = buildCurrentSearchParams(cursorVal);

      const result = await loadInquiryListPage(
        inquiryApi,
        searchParams,
        20,
        MAX_FILTER_BATCH_COUNT,
      );
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
      console.error(err);
      setError('데이터를 불러오는 중 문제가 발생했습니다. 백엔드 서버 연결 상태를 확인해 주세요.');
    } finally {
      if (!silent) {
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
          console.error(err);
          setError('데이터를 새로고침하는 중 문제가 발생했습니다.');
        } finally {
          if (!silent) {
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

  const handleManualRefresh = useCallback(() => {
    if (isBatchSelectionMode && selectedInquiryIds.size > 0) {
      const shouldRefresh = window.confirm(
        '일괄 처리 중 새로고침하면 선택 항목이 초기화됩니다. 계속 새로고침할까요?'
      );
      if (!shouldRefresh) return;

      setSelectedInquiryIds(new Set());
      setBatchSelectionScope('PAGE');
      setBatchNotice(null);
      setIsBatchSelectionMode(false);
    }

    handleRefresh(false);
  }, [handleRefresh, isBatchSelectionMode, selectedInquiryIds.size]);

  const loadMoreBatchInquiries = useCallback(async () => {
    if (loading || loadingMore || !hasNext || !nextCursor) return;
    setLoadingMore(true);
    try {
      const searchParams = buildCurrentSearchParams(nextCursor);
      const res = await inquiryApi.searchInquiries({
        ...searchParams,
        size: 20,
      });

      setInquiries((prev) => {
        const existingIds = new Set(prev.map(inq => inq.id));
        const newItems = res.content.filter(inq => !existingIds.has(inq.id));
        return [...prev, ...newItems];
      });
      setHasNext(res.hasNext);
      setNextCursor(res.nextCursor);
      setCurrentPage((prev) => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasNext, nextCursor, buildCurrentSearchParams]);

  const fetchBookmarks = useCallback(async () => {
    try {
      const ids = await inquiryApi.getBookmarks();
      setBookmarkedIds(new Set(ids));
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
      setBookmarkedIds(new Set());
    }
  }, []);

  const fetchCustomFilters = useCallback(async () => {
    try {
      const filters = await inquiryApi.getCustomFilters();
      setCustomFilters(filters);
    } catch (err) {
      console.error('Failed to fetch custom filters:', err);
      setCustomFilters([]);
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
      setLoading(true);
      setError(null);
      try {
        const searchParams = buildCurrentSearchParams(nextCursor);
        const res = await inquiryApi.searchInquiries({
          ...searchParams,
          size: 20,
        });

        // Cache the newly fetched page
        setPageCache((prev) => storePage(prev, targetPage, res));

        // Set inquiries for the target page
        setInquiries(res.content);
        setHasNext(res.hasNext);
        setNextCursor(res.nextCursor);
        setCurrentPage(targetPage);
      } catch (err) {
        console.error(err);
        setError('데이터를 불러오는 중 문제가 발생했습니다.');
      } finally {
        setLoading(false);
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
    setBatchNotice(null);
  }, [currentPage]);

  const handleCancelBatchSelection = useCallback(() => {
    setSelectedInquiryIds(new Set());
    setBatchSelectionScope('PAGE');
    setBatchNotice(null);
    setIsBatchSelectionMode(false);
  }, []);

  const handleToggleSelectInquiry = useCallback((id: string, checked: boolean) => {
    setBatchNotice(null);
    setSelectedInquiryIds((prev) => toggleSelection(prev, id, checked));
  }, []);

  const handleToggleSelectAll = () => {
    setBatchNotice(null);
    setSelectedInquiryIds((prev) => toggleVisibleSelection(
      prev,
      inquiries.map((inquiry) => inquiry.id),
    ));
  };

  const handleExecuteBatchStatusUpdate = async () => {
    const selectedBatchCount = selectedInquiryIds.size;
    if (selectedBatchCount === 0 || !batchModal.targetStatus) return;
    if (!batchModal.reason || batchModal.reason.trim().length < 5) {
      setBatchModal((prev) => ({
        ...prev,
        error: '상태 변경 사유를 최소 5자 이상 입력해주세요.'
      }));
      return;
    }

    setBatchModal((prev) => ({ ...prev, isSubmitting: true, error: null }));
    try {
      const isFilterMode = selectedBatchCount >= 100;

      const target: BatchUpdateInquiryStatusTarget = isFilterMode
        ? {
            mode: 'FILTER',
            filters: buildCurrentSearchParams(null),
            excludedInquiryIds: inquiries
              .filter((inq) => !selectedInquiryIds.has(inq.id))
              .map((inq) => inq.id),
          }
        : {
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
      setBatchSelectionScope('PAGE');
      setBatchNotice(null);
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
      fetchStats();
      fetchPage(null);
    } catch (err) {
      console.error(err);
      alert('티켓 생성에 실패했습니다: ' + getErrorMessage(err));
    }
  };

  const getLocalDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const today = getLocalDateInputValue(new Date());
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
      alert('즐겨찾기 변경에 실패했습니다: ' + getErrorMessage(err));
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

                  {batchNotice && (
                    <div className={`batch-notice-message${batchSelectionScope === 'FILTER' ? ' active' : ''}`}>
                      {batchNotice}
                    </div>
                  )}

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
                  {error && (
                    <div className="batch-workspace-error">
                      ⚠️ {error}
                    </div>
                  )}

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
                      미처리
                    </button>
                    <button
                      type="button"
                      className="batch-status-btn in-progress"
                      disabled={selectedBatchCount === 0}
                      onClick={() => setBatchModal({ isOpen: true, targetStatus: 'IN_PROGRESS', isSubmitting: false, error: null, reason: '' })}
                    >
                      진행중
                    </button>
                    <button
                      type="button"
                      className="batch-status-btn resolved"
                      disabled={selectedBatchCount === 0}
                      onClick={() => setBatchModal({ isOpen: true, targetStatus: 'RESOLVED', isSubmitting: false, error: null, reason: '' })}
                    >
                      완료
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="inquiry-scroll-area" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 4px 6px 4px', minHeight: 0, width: '100%' }}>
                {error && (
                  <div
                    style={{
                      padding: '12px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '10px',
                      color: '#f87171',
                      fontSize: '13px',
                      lineHeight: 1.5
                    }}
                  >
                    ⚠️ {error}
                  </div>
                )}

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

      {/* Batch Status Confirmation Modal */}
      {batchModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
            <div className="modal-header">
              <h3 className="modal-title">일괄 상태 변경</h3>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setBatchModal({ isOpen: false, targetStatus: null, isSubmitting: false, error: null, reason: '' })}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              선택한 <strong style={{ color: 'var(--accent-indigo)' }}>{selectedBatchCount}개</strong>의 문의 상태를 
              {' '}
              <strong style={{ 
                color: batchModal.targetStatus === 'OPEN' ? 'var(--status-open)' : 
                       batchModal.targetStatus === 'IN_PROGRESS' ? 'var(--status-inprogress)' : 
                       'var(--status-resolved)' 
              }}>
                {batchModal.targetStatus === 'OPEN' ? '미처리' : 
                 batchModal.targetStatus === 'IN_PROGRESS' ? '진행중' : 
                 '완료'}
              </strong>
               상태로 일괄 변경하시겠습니까?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="batch-change-reason" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  일괄 변경 사유 (필수)
                </label>
                <span style={{ fontSize: '11px', color: (batchModal.reason || '').trim().length >= 5 ? 'var(--accent-indigo)' : 'var(--text-muted)', fontWeight: 500 }}>
                  ({(batchModal.reason || '').trim().length} / 최소 5자)
                </span>
              </div>
              <textarea
                id="batch-change-reason"
                className="form-textarea"
                placeholder="일괄 상태를 변경하는 사유를 5자 이상 입력해주세요..."
                value={batchModal.reason || ''}
                onChange={(e) => setBatchModal(prev => ({ ...prev, reason: e.target.value, error: null }))}
                aria-invalid={Boolean(batchModal.error)}
                aria-describedby={batchModal.error ? 'batch-change-reason-error' : undefined}
                style={{
                  minHeight: '80px',
                  height: '80px',
                  padding: '10px 12px',
                  fontSize: '12.5px',
                  borderRadius: '8px',
                  resize: 'none',
                  border: batchModal.error ? '1px solid #ef4444' : '1px solid var(--border-light)',
                  background: '#ffffff',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            {batchModal.error && (
              <div id="batch-change-reason-error" role="alert" style={{ color: '#ef4444', fontSize: '13px', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginTop: '12px' }}>
                {batchModal.error}
              </div>
            )}
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="secondary-btn"
                disabled={batchModal.isSubmitting}
                onClick={() => setBatchModal({ isOpen: false, targetStatus: null, isSubmitting: false, error: null, reason: '' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-medium)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={batchModal.isSubmitting}
                onClick={handleExecuteBatchStatusUpdate}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent-indigo)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {batchModal.isSubmitting ? '변경 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

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
