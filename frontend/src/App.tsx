import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkedStatsCard, UnprocessedStatsCard, TodayStatsCard } from './components/StatsCards';
import { FilterBar } from './components/FilterBar';
import type { FilterValues } from './components/FilterBar';
import { InquiryList } from './components/InquiryList';
import { Pagination } from './components/Pagination';
import { CreateTicketModal } from './components/CreateTicketModal';
import { inquiryApi } from './api/inquiryApi';
import type { BatchUpdateInquiryStatusTarget, OperatorInfo } from './api/inquiryApi';
import type { CustomFilterEntity, CustomerInquiry, InquiryStatus } from './types/inquiry';
import { Plus, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, User, Bookmark, X, ListChecks } from 'lucide-react';
import { NaverLoginRenewPage } from './components/NaverLoginRenewPage';
import { InquiryDetailPanel } from './components/InquiryDetailPanel';

const SIDEBAR_EXPANDED_WIDTH = 300;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const MAX_FILTER_BATCH_COUNT = 100;
type BatchSelectionScope = 'PAGE' | 'FILTER';

export const App: React.FC = () => {
  const isNaverLogin = window.location.pathname === '/naver-login';

  if (isNaverLogin) {
    return <NaverLoginRenewPage />;
  }

  // Operator (현재 로그인한 관리자) 상태 — Nginx Basic Auth에서 파생
  const [currentOperator, setCurrentOperator] = useState<OperatorInfo | null>(null);

  // Naver Session states
  const [naverSessionStatus, setNaverSessionStatus] = useState<'ACTIVE' | 'EXPIRED' | 'MISSING' | 'CHECKING' | 'ERROR'>('CHECKING');
  const [naverSessionUpdatedAt, setNaverSessionUpdatedAt] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [isNaverRenewModalOpen, setIsNaverRenewModalOpen] = useState(false);

  // Query Filter states
  const [queryFilters, setQueryFilters] = useState<FilterValues>({
    userCode: '',
    statuses: [],
    channels: [],
    startDate: '',
    endDate: '',
    isManual: undefined,
    bookmarkedOnly: false,
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Data states
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch selection states
  const [isBatchSelectionMode, setIsBatchSelectionMode] = useState(false);
  const [batchSelectionScope, setBatchSelectionScope] = useState<BatchSelectionScope>('PAGE');
  const [selectedInquiryIds, setSelectedInquiryIds] = useState<Set<string>>(new Set());
  const [batchBaseOffset, setBatchBaseOffset] = useState(0);
  const [pageCache, setPageCache] = useState<Record<number, {
    inquiries: CustomerInquiry[];
    nextCursor: string | null;
    hasNext: boolean;
  }>>({});
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [batchModal, setBatchModal] = useState<{
    isOpen: boolean;
    targetStatus: InquiryStatus | null;
    isSubmitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    targetStatus: null,
    isSubmitting: false,
    error: null
  });

  // Stats states
  const [unprocessedCount, setUnprocessedCount] = useState(0);
  const [unprocessedHasMore, setUnprocessedHasMore] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [todayHasMore, setTodayHasMore] = useState(false);
  const [totalListCount, setTotalListCount] = useState(0);
  const [totalListHasMore, setTotalListHasMore] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [customFilters, setCustomFilters] = useState<CustomFilterEntity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Resizable & Collapsible columns states
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [listWidth, setListWidth] = useState(300);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingList, setIsResizingList] = useState(false);

  // Nested Sidebar Widget Groups DND
  interface WidgetGroup {
    id: 'account_session_group' | 'filter_group';
    name: string;
    items: string[];
  }

  const [groups, setGroups] = useState<WidgetGroup[]>(() => {
    const saved = localStorage.getItem('admin_cs_sidebar_groups_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'account_session_group',
        name: '계정 및 연동 정보',
        items: ['PROFILE', 'SESSION']
      },
      {
        id: 'filter_group',
        name: '필터 목록',
        items: ['STATS_UNPROCESSED', 'STATS_TODAY', 'BOOKMARKS', 'CUSTOM_FILTERS']
      }
    ];
  });

  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
  const [draggedItemInfo, setDraggedItemInfo] = useState<{ groupId: string; itemIndex: number } | null>(null);

  useEffect(() => {
    localStorage.setItem('admin_cs_sidebar_groups_v3', JSON.stringify(groups));
  }, [groups]);

  const onDragStartGroup = (e: React.DragEvent, index: number) => {
    setDraggedGroupIndex(index);
    setDraggedItemInfo(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverGroup = (_e: React.DragEvent, targetIndex: number) => {
    if (draggedGroupIndex === null || draggedGroupIndex === targetIndex) return;
    const next = [...groups];
    const [moved] = next.splice(draggedGroupIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDraggedGroupIndex(targetIndex);
    setGroups(next);
  };

  const onDragEndGroup = () => {
    setDraggedGroupIndex(null);
  };

  const onDragStartItem = (e: React.DragEvent, groupId: string, itemIndex: number) => {
    setDraggedItemInfo({ groupId, itemIndex });
    setDraggedGroupIndex(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverItem = (_e: React.DragEvent, targetGroupId: string, targetItemIndex: number) => {
    if (draggedItemInfo === null) return;
    if (draggedItemInfo.groupId !== targetGroupId) return; // restrict same-group DND
    if (draggedItemInfo.itemIndex === targetItemIndex) return;

    const next = groups.map(g => {
      if (g.id === targetGroupId) {
        const nextItems = [...g.items];
        const [moved] = nextItems.splice(draggedItemInfo.itemIndex, 1);
        nextItems.splice(targetItemIndex, 0, moved);
        return { ...g, items: nextItems };
      }
      return g;
    });
    setGroups(next);
    setDraggedItemInfo({ groupId: targetGroupId, itemIndex: targetItemIndex });
  };

  const onDragEndItem = () => {
    setDraggedItemInfo(null);
  };

  const startResizingSidebar = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizingSidebar(true);
    const startX = mouseDownEvent.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const deltaX = mouseMoveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(SIDEBAR_EXPANDED_WIDTH, startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingSidebar(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

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
      window.location.href = `/api/auth/logout?current=${encodeURIComponent(currentUserId)}`;
    }
  };

  const renderNaverSessionWidget = () => {
    const getBadgeClass = () => {
      switch (naverSessionStatus) {
        case 'ACTIVE': return 'active';
        case 'EXPIRED': return 'expired';
        case 'MISSING': return 'missing';
        case 'CHECKING': return 'checking';
        default: return 'missing';
      }
    };

    const getStatusText = () => {
      switch (naverSessionStatus) {
        case 'ACTIVE': return '세션 정상';
        case 'EXPIRED': return '세션 만료됨';
        case 'MISSING': return '세션 없음';
        case 'CHECKING': return '검사 중...';
        case 'ERROR': return '검사 에러';
        default: return '조회 대기';
      }
    };

    const formatTime = (isoString: string | null) => {
      if (!isoString) return '기록 없음';
      try {
        const d = new Date(isoString);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } catch {
        return '날짜 형식 오류';
      }
    };

    if (isSidebarCollapsed) {
      const getDotColor = () => {
        switch (naverSessionStatus) {
          case 'ACTIVE': return '#16a34a';
          case 'EXPIRED': return '#dc2626';
          case 'MISSING': return '#d97706';
          case 'CHECKING': return '#2563eb';
          default: return '#dc2626';
        }
      };

      return (
        <div
          className="collapsed-tooltip collapsed-session-dot"
          data-tooltip={`네이버 세션: ${getStatusText()} - 클릭 시 실시간 검사`}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'pointer' }}
          onClick={handleValidateNaverSession}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: getDotColor(),
              boxShadow: `0 0 8px ${getDotColor()}`
            }}
          />
        </div>
      );
    }

    return (
      <div className="naver-session-widget">
        <div className={`naver-session-status-icon ${getBadgeClass()}`} aria-hidden="true">
          <div className="naver-session-dot" />
        </div>

        <div className="naver-session-info">
          <span className="naver-session-label">네이버 카페 세션</span>
          <strong className="naver-session-status-text">{getStatusText()}</strong>
          <span className="naver-session-time">
            최근 확인: {formatTime(naverSessionUpdatedAt)}
          </span>
        </div>

        <div className="naver-session-actions">
          <button
            type="button"
            className="btn-session-action verify"
            onClick={handleValidateNaverSession}
            disabled={naverSessionStatus === 'CHECKING'}
            title="네이버 세션을 실시간으로 직접 확인합니다"
            aria-label="네이버 세션 실시간 검사"
          >
            <RefreshCw size={12} className={naverSessionStatus === 'CHECKING' ? 'spin' : ''} />
          </button>

          {(naverSessionStatus === 'EXPIRED' || naverSessionStatus === 'MISSING' || naverSessionStatus === 'ERROR') && (
            <button
              type="button"
              className="btn-session-action renew"
              onClick={() => setIsNaverRenewModalOpen(true)}
              title="네이버 세션을 새로 로그인하여 갱신합니다"
              aria-label="네이버 세션 갱신"
            >
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>
    );
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
      status: queryFilters.statuses.length > 0 ? queryFilters.statuses : undefined,
      channel: queryFilters.channels.length > 0 ? queryFilters.channels : undefined,
      start: startISO,
      end: endISO,
      isManual: queryFilters.isManual,
      bookmarkedOnly: queryFilters.bookmarkedOnly || undefined,
      cursor: cursorVal || undefined,
    };
  }, [queryFilters]);

  // Fetch inquiries for the current page and filter conditions
  const fetchPage = useCallback(async (cursorVal: string | null) => {
    setLoading(true);
    setError(null);
    setSelectedInquiryIds(new Set()); // Reset selection on page/filter change
    setBatchSelectionScope('PAGE');
    setBatchNotice(null);
    setIsBatchSelectionMode(false);
    try {
      const searchParams = buildCurrentSearchParams(cursorVal);

      const res = await inquiryApi.searchInquiries({
        ...searchParams,
        size: 20,
      });

      setInquiries(res.content);
      setHasNext(res.hasNext);
      setNextCursor(res.nextCursor);

      // Cache Page 1 on initial fetch or when cursorVal is null
      if (!cursorVal) {
        setPageCache({
          1: {
            inquiries: res.content,
            nextCursor: res.nextCursor,
            hasNext: res.hasNext
          }
        });
        setCurrentPage(1);
        setSelectedInquiryId(null);
      }

      // Fetch matching inquiries count with 100 limit
      const countRes = await inquiryApi.countInquiries({
        ...buildCurrentSearchParams(null),
        limit: MAX_FILTER_BATCH_COUNT
      });
      setTotalListCount(countRes.count);
      setTotalListHasMore(countRes.hasMore);
    } catch (err: any) {
      console.error(err);
      setError('데이터를 불러오는 중 문제가 발생했습니다. 백엔드 서버 연결 상태를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [buildCurrentSearchParams]);

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

  // Load inquiries when filters change or page index changes
  useEffect(() => {
    // Reset page to Page 1 when search filters change
    setCurrentPage(1);
    fetchPage(null);
  }, [queryFilters, fetchPage]);

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
        fetchBookmarks();
        fetchCustomFilters();
      })
      .catch((err) => {
        console.warn('관리자 계정 정보를 불러오지 못했습니다 (fallback 사용):', err);
        setCurrentOperator({ id: 'unknown', nickname: '알 수 없음', email: '' });
      });
  }, [fetchBookmarks, fetchCustomFilters]);

  // Load stats and Naver session status periodically and on mount
  useEffect(() => {
    fetchStats();
    fetchNaverSessionStatus();
  }, [fetchStats, fetchNaverSessionStatus]);

  // Pagination Handlers
  const handleNextPage = async () => {
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
        setPageCache((prev) => ({
          ...prev,
          [targetPage]: {
            inquiries: res.content,
            nextCursor: res.nextCursor,
            hasNext: res.hasNext
          }
        }));

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
  };

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
  }, [currentPage, pageCache, hasNext, nextCursor]);

  const handleUpdateInquiry = useCallback((id: string, updatedFields: Partial<CustomerInquiry>) => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, ...updatedFields } : inq))
    );
    setPageCache((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        const pageNum = Number(key);
        updated[pageNum] = {
          ...updated[pageNum],
          inquiries: updated[pageNum].inquiries.map((inq) =>
            inq.id === id ? { ...inq, ...updatedFields } : inq
          ),
        };
      });
      return updated;
    });
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
    setSelectedInquiryIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = () => {
    const allPageIds = inquiries.map((inq) => inq.id);
    const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedInquiryIds.has(id));

    setBatchNotice(null);

    setSelectedInquiryIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleExecuteBatchStatusUpdate = async () => {
    const selectedBatchCount = selectedInquiryIds.size;
    if (selectedBatchCount === 0 || !batchModal.targetStatus) return;

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
      await inquiryApi.updateInquiryStatuses(target, batchModal.targetStatus);

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
        error: null
      });
      setSelectedInquiryIds(new Set());
      setBatchSelectionScope('PAGE');
      setBatchNotice(null);
      setIsBatchSelectionMode(false);
    } catch (err: any) {
      console.error(err);
      setBatchModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: '상태 일괄 변경 중 오류가 발생했습니다: ' + err.message
      }));
    }
  };

  const handleCreateTicket = async (ticketData: { channel: string; userCode: string; content: string; channelMetadata?: any; imageUrls?: string[] }) => {
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
    } catch (err: any) {
      console.error(err);
      alert('티켓 생성에 실패했습니다: ' + err.message);
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
      statuses: [],
      channels: [],
      startDate: '',
      endDate: '',
      isManual: undefined,
      bookmarkedOnly: true,
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
    } catch (err: any) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) {
          next.add(inquiryId);
        } else {
          next.delete(inquiryId);
        }
        return next;
      });
      alert('즐겨찾기 변경에 실패했습니다: ' + err.message);
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

  const filterDataToValues = (filter: CustomFilterEntity): FilterValues => {
    const data = filter.filterData || {};
    return {
      userCode: data.userCode || '',
      statuses: data.statuses || [],
      channels: data.channels || [],
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      isManual: data.isManual,
      bookmarkedOnly: Boolean(data.bookmarkedOnly),
    };
  };

  const handleCustomFilterShortcutClick = (filter: CustomFilterEntity) => {
    setQueryFilters(filterDataToValues(filter));
  };

  const getCustomFilterSummary = (filter: CustomFilterEntity) => {
    const values = filterDataToValues(filter);
    const parts: string[] = [];
    if (values.statuses.length > 0) parts.push(values.statuses.join(', '));
    if (values.channels.length > 0) parts.push(values.channels.join(', '));
    if (values.userCode) parts.push(values.userCode);
    if (values.bookmarkedOnly) parts.push('즐겨찾기');
    if (values.isManual !== undefined) parts.push(values.isManual ? '수동' : '자동');
    if (values.startDate || values.endDate) parts.push(`${values.startDate || '전체'}~${values.endDate || '전체'}`);
    return parts.length > 0 ? parts.join(' · ') : '전체 조건';
  };

  const renderCustomFilterShortcut = (filter: CustomFilterEntity, isCollapsed: boolean) => {
    const summary = getCustomFilterSummary(filter);

    if (isCollapsed) {
      return (
        <button
          key={`custom-filter-${filter.id}`}
          type="button"
          className="collapsed-tooltip custom-filter-compact"
          data-tooltip={`${filter.name} - ${summary}`}
          aria-label={`${filter.name} 필터 적용`}
          onClick={() => handleCustomFilterShortcutClick(filter)}
        >
          <Bookmark size={16} />
        </button>
      );
    }

    return (
      <button
        key={`custom-filter-${filter.id}`}
        type="button"
        className="custom-filter-shortcut"
        onClick={() => handleCustomFilterShortcutClick(filter)}
        title={summary}
        style={{ width: '100%' }}
      >
        <div className="custom-filter-shortcut-icon">
          <Bookmark size={20} />
        </div>
        <div className="custom-filter-shortcut-info">
          <span className="custom-filter-shortcut-name">{filter.name}</span>
          <span className="custom-filter-shortcut-summary">{summary}</span>
        </div>
        <div className="custom-filter-shortcut-badge">저장됨</div>
      </button>
    );
  };

  const renderGroupItem = (item: string) => {
    switch (item) {
      case 'PROFILE':
        return renderOperatorWidget();
      case 'SESSION':
        return renderNaverSessionWidget();
      case 'STATS_UNPROCESSED':
        return (
          <UnprocessedStatsCard
            count={unprocessedCount}
            hasMore={unprocessedHasMore}
            isCollapsed={false}
            onClick={handleUnprocessedStatsClick}
          />
        );
      case 'STATS_TODAY':
        return (
          <TodayStatsCard
            count={todayCount}
            hasMore={todayHasMore}
            isCollapsed={false}
            onClick={handleTodayStatsClick}
          />
        );
      case 'BOOKMARKS':
        return (
          <BookmarkedStatsCard
            count={bookmarkedIds.size}
            isCollapsed={false}
            onClick={handleBookmarkedStatsClick}
          />
        );
      case 'CUSTOM_FILTERS':
        return (
          <div className="custom-filter-shortcut-list" style={{ marginTop: '2px' }}>
            {customFilters.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '10px 12px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
                저장된 필터가 없습니다.
              </div>
            ) : (
              customFilters.map((filter) => renderCustomFilterShortcut(filter, false))
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderCollapsedGroupItem = (item: string) => {
    switch (item) {
      case 'PROFILE':
        return renderOperatorWidget();
      case 'SESSION':
        return renderNaverSessionWidget();
      case 'STATS_UNPROCESSED':
        return (
          <UnprocessedStatsCard
            count={unprocessedCount}
            hasMore={unprocessedHasMore}
            isCollapsed={true}
            onClick={handleUnprocessedStatsClick}
          />
        );
      case 'STATS_TODAY':
        return (
          <TodayStatsCard
            count={todayCount}
            hasMore={todayHasMore}
            isCollapsed={true}
            onClick={handleTodayStatsClick}
          />
        );
      case 'BOOKMARKS':
        return (
          <BookmarkedStatsCard
            count={bookmarkedIds.size}
            isCollapsed={true}
            onClick={handleBookmarkedStatsClick}
          />
        );
      case 'CUSTOM_FILTERS':
        return (
          customFilters.map((filter) => (
            <div key={`collapsed-custom-${filter.id}`} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
              {renderCustomFilterShortcut(filter, true)}
            </div>
          ))
        );
      default:
        return null;
    }
  };

  const findSelectedInquiry = () => {
    if (!selectedInquiryId) return undefined;
    const found = inquiries.find((inq) => inq.id === selectedInquiryId);
    if (found) return found;
    for (const pageNum of Object.keys(pageCache).map(Number)) {
      const cacheEntry = pageCache[pageNum];
      const cachedFound = cacheEntry.inquiries.find((inq) => inq.id === selectedInquiryId);
      if (cachedFound) return cachedFound;
    }
    return undefined;
  };
  const selectedInquiry = findSelectedInquiry();
  const effectiveVisibleSelectedIds = selectedInquiryIds;
  const selectedBatchCount = selectedInquiryIds.size;
  const allVisibleSelected = inquiries.length > 0 && inquiries.every((inquiry) => selectedInquiryIds.has(inquiry.id));
  const someVisibleSelected = inquiries.some((inquiry) => selectedInquiryIds.has(inquiry.id));

  const renderOperatorWidget = () => {
    const operatorName = currentOperator?.nickname || '계정 확인 중';
    const operatorId = currentOperator?.id || 'loading';
    const operatorEmail = currentOperator?.email || '';
    const isFallbackOperator = currentOperator?.id === 'unknown';
    const title = currentOperator
      ? `현재 로그인: ${operatorName} (${operatorId})\n[클릭하면 로그아웃/계정 변경]`
      : '현재 로그인 계정 확인 중';

    if (isSidebarCollapsed) {
      return (
        <button
          type="button"
          onClick={handleSwitchAccount}
          className={`collapsed-tooltip operator-compact ${isFallbackOperator ? 'unknown' : ''}`}
          data-tooltip={title}
          aria-label={title}
          style={{ cursor: 'pointer' }}
        >
          <User size={17} />
        </button>
      );
    }

    return (
      <button 
        type="button"
        className={`operator-widget ${isFallbackOperator ? 'unknown' : ''}`} 
        title={title}
        onClick={handleSwitchAccount}
        style={{ 
          border: '1px solid rgba(79, 70, 229, 0.16)',
          borderRadius: '8px',
          background: 'rgba(79, 70, 229, 0.04)',
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(79, 70, 229, 0.08)';
          e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.35)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(79, 70, 229, 0.04)';
          e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.16)';
        }}
      >
        <div className="operator-avatar">
          <User size={16} />
        </div>
        <div className="operator-info">
          <span className="operator-label">현재 로그인 (변경하려면 클릭)</span>
          <strong className="operator-name">{operatorName}</strong>
          <span className="operator-meta">{operatorEmail || operatorId}</span>
        </div>
      </button>
    );
  };


  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>
      {/* Left Sidebar */}
      <aside
        className="dashboard-sidebar"
        style={{
          width: isSidebarCollapsed ? `${SIDEBAR_COLLAPSED_WIDTH}px` : `${sidebarWidth}px`,
          minWidth: isSidebarCollapsed ? `${SIDEBAR_COLLAPSED_WIDTH}px` : undefined,
          maxWidth: isSidebarCollapsed ? `${SIDEBAR_COLLAPSED_WIDTH}px` : `${SIDEBAR_EXPANDED_WIDTH}px`,
          padding: isSidebarCollapsed ? '20px 0' : undefined,
          alignItems: isSidebarCollapsed ? 'center' : undefined,
          overflowX: isSidebarCollapsed ? 'visible' : 'hidden',
          overflowY: isSidebarCollapsed ? 'visible' : 'auto',
          transition: 'width 0.2s ease',
          gap: isSidebarCollapsed ? '8px' : undefined
        }}
      >
        {isSidebarCollapsed ? (
          /* ── Collapsed Sidebar ── */
          <>
            {/* Expand Button */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="collapsed-tooltip"
              data-tooltip="사이드바 펼치기"
              aria-label="사이드바 펼치기"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                width: '40px',
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <ChevronRight size={18} />
            </button>

            {groups.map((group, groupIdx) => (
              <React.Fragment key={`collapsed-group-${group.id}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
                  {group.items.map((item) => (
                    <React.Fragment key={`collapsed-${item}`}>
                      {renderCollapsedGroupItem(item)}
                    </React.Fragment>
                  ))}
                </div>
                {groupIdx === 0 && (
                  <div style={{ height: '1px', background: 'var(--border-light)', margin: '8px 0', width: '24px', flexShrink: 0 }} />
                )}
              </React.Fragment>
            ))}

            {/* Compact Create Button */}
            <button
              type="button"
              className="btn-primary glow-violet-hover collapsed-tooltip"
              onClick={() => setIsModalOpen(true)}
              data-tooltip="CS 티켓 수동 생성"
              aria-label="CS 티켓 수동 생성"
              style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center', borderRadius: '50%', marginTop: 'auto', marginBottom: '8px', flexShrink: 0 }}
            >
              <Plus size={18} />
            </button>
          </>
        ) : (
          /* ── Expanded Sidebar ── */
          <>
            <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
                <h1 className="gradient-text">Admin CS</h1>
                <p className="sidebar-subtitle">고객 문의를 통합 관리합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="panel-toggle-btn"
                title="사이드바 접기"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', marginTop: '4px' }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Scrollable middle area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              
              {groups.map((group, groupIdx) => (
                <div
                  key={group.id}
                  draggable
                  onDragStart={(e) => onDragStartGroup(e, groupIdx)}
                  onDragOver={(e) => { e.preventDefault(); onDragOverGroup(e, groupIdx); }}
                  onDragEnd={onDragEndGroup}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    width: '100%',
                    opacity: draggedGroupIndex === groupIdx ? 0.4 : 1,
                    transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.2s, border-color 0.2s',
                    padding: '4px',
                    border: '1px dashed transparent',
                    borderRadius: '8px',
                  }}
                  onDragEnter={(e) => {
                    if (draggedGroupIndex !== null && draggedGroupIndex !== groupIdx) {
                      e.currentTarget.style.borderColor = 'var(--accent-indigo)';
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.02)';
                    }
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onDrop={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Group Header (acts as handle / title) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px', padding: '0 2px', cursor: 'grab', userSelect: 'none' }}>
                    {group.id === 'account_session_group' ? <User size={11} /> : <Bookmark size={11} />}
                    {group.name}
                  </div>

                  {/* Group Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {group.items.map((item, itemIdx) => {
                      const isItemDragged = draggedItemInfo?.groupId === group.id && draggedItemInfo?.itemIndex === itemIdx;
                      return (
                        <div
                          key={item}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation(); // Prevent group dragging
                            onDragStartItem(e, group.id, itemIdx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDragOverItem(e, group.id, itemIdx);
                          }}
                          onDragEnd={onDragEndItem}
                          style={{
                            width: '100%',
                            opacity: isItemDragged ? 0.4 : 1,
                            cursor: 'grab',
                            transition: 'transform 0.15s',
                          }}
                          onDragEnter={(e) => {
                            if (draggedItemInfo && draggedItemInfo.groupId === group.id && draggedItemInfo.itemIndex !== itemIdx) {
                              e.currentTarget.style.transform = 'scale(1.02)';
                            }
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                          }}
                          onDrop={(e) => {
                            e.currentTarget.style.transform = 'none';
                          }}
                        >
                          {renderGroupItem(item)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Divider line between groups */}
                  {groupIdx === 0 && (
                    <div style={{ height: '1px', background: 'var(--border-light)', margin: '12px 0 4px 0', width: '100%', flexShrink: 0 }} />
                  )}
                </div>
              ))}

            </div>

            {/* CS 티켓 수동 생성 — 하단 고정 */}
            <button
              type="button"
              className="btn-primary glow-violet-hover"
              onClick={() => setIsModalOpen(true)}
              style={{ width: '100%', justifyContent: 'center', marginTop: '12px', flexShrink: 0 }}
            >
              <Plus size={16} />
              CS 티켓 수동 생성
            </button>
          </>
        )}
      </aside>

      {/* Resize Divider 1 */}
      <div
        className={`resize-divider ${isResizingSidebar ? 'active' : ''}`}
        onMouseDown={!isSidebarCollapsed ? startResizingSidebar : undefined}
        style={{ display: isSidebarCollapsed ? 'none' : undefined }}
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
          transition: 'width 0.2s ease',
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
                {inquiries.length > 0 && !loading && !isBatchSelectionMode && (
                  <button
                    type="button"
                    className="batch-mode-btn"
                    onClick={handleStartBatchSelection}
                    title="여러 문의를 선택해 상태를 일괄 변경"
                  >
                    <ListChecks size={14} />
                    <span>배치 처리</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsListCollapsed(true)}
                  title="목록 접기"
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
                      onClick={() => setBatchModal({ isOpen: true, targetStatus: 'OPEN', isSubmitting: false, error: null })}
                    >
                      미처리
                    </button>
                    <button
                      type="button"
                      className="batch-status-btn in-progress"
                      disabled={selectedBatchCount === 0}
                      onClick={() => setBatchModal({ isOpen: true, targetStatus: 'IN_PROGRESS', isSubmitting: false, error: null })}
                    >
                      진행중
                    </button>
                    <button
                      type="button"
                      className="batch-status-btn resolved"
                      disabled={selectedBatchCount === 0}
                      onClick={() => setBatchModal({ isOpen: true, targetStatus: 'RESOLVED', isSubmitting: false, error: null })}
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

            {false && isBatchSelectionMode && selectedBatchCount > 0 && (
              <div className="batch-action-panel">
                <div className="batch-panel-summary">
                  <span className="batch-info-count">{selectedBatchCount}</span>
                  <span>{batchSelectionScope === 'FILTER' ? '검색 결과 선택됨' : '개 선택됨'}</span>
                </div>
                <div className="batch-actions-section">
                  <button
                    type="button"
                    className="batch-action-btn open-status"
                    onClick={() => setBatchModal({ isOpen: true, targetStatus: 'OPEN', isSubmitting: false, error: null })}
                  >
                    미처리
                  </button>
                  <button
                    type="button"
                    className="batch-action-btn inprogress-status"
                    onClick={() => setBatchModal({ isOpen: true, targetStatus: 'IN_PROGRESS', isSubmitting: false, error: null })}
                  >
                    진행중
                  </button>
                  <button
                    type="button"
                    className="batch-action-btn resolved-status"
                    onClick={() => setBatchModal({ isOpen: true, targetStatus: 'RESOLVED', isSubmitting: false, error: null })}
                  >
                    완료
                  </button>
                  <button
                    type="button"
                    className="batch-cancel-btn"
                    onClick={handleCancelBatchSelection}
                  >
                    취소
                  </button>
                </div>
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
            {isListCollapsed && (
              <div style={{ alignSelf: 'flex-start', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsListCollapsed(false)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronRight size={16} />
                  목록 열기
                </button>
              </div>
            )}
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

      {/* Batch Status Confirmation Modal */}
      {batchModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
            <div className="modal-header">
              <h3 className="modal-title">일괄 상태 변경</h3>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setBatchModal({ isOpen: false, targetStatus: null, isSubmitting: false, error: null })}
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
            {batchModal.error && (
              <div style={{ color: '#ef4444', fontSize: '13px', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                ⚠️ {batchModal.error}
              </div>
            )}
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="secondary-btn"
                disabled={batchModal.isSubmitting}
                onClick={() => setBatchModal({ isOpen: false, targetStatus: null, isSubmitting: false, error: null })}
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
          onClose={() => setIsNaverRenewModalOpen(false)}
        />,
        document.body
      )}
    </div>
  );
};

export default App;
