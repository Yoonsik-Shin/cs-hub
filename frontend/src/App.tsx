import React, { useState, useEffect, useCallback } from 'react';
import { StatsCards } from './components/StatsCards';
import { FilterBar } from './components/FilterBar';
import type { FilterValues } from './components/FilterBar';
import { InquiryList } from './components/InquiryList';
import { Pagination } from './components/Pagination';
import { CreateTicketModal } from './components/CreateTicketModal';
import { inquiryApi } from './api/inquiryApi';
import type { OperatorInfo } from './api/inquiryApi';
import type { CustomerInquiry } from './types/inquiry';
import { Plus, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { NaverLoginRenewPage } from './components/NaverLoginRenewPage';
import { InquiryDetailPanel } from './components/InquiryDetailPanel';

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

  // Query Filter states
  const [queryFilters, setQueryFilters] = useState<FilterValues>({
    userCode: '',
    statuses: [],
    channels: [],
    startDate: '',
    endDate: '',
  });

  // Pagination states (Cursor Stack for page-like navigation)
  // cursorStack holds the starting cursor for each page. Page 1 starts with null.
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);

  // Data states
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats states
  const [unprocessedCount, setUnprocessedCount] = useState(0);
  const [unprocessedHasMore, setUnprocessedHasMore] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [todayHasMore, setTodayHasMore] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Resizable & Collapsible columns states
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [listWidth, setListWidth] = useState(300);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingList, setIsResizingList] = useState(false);

  const startResizingSidebar = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizingSidebar(true);
    const startX = mouseDownEvent.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const deltaX = mouseMoveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(450, startWidth + deltaX));
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
      const newWidth = Math.max(300, Math.min(600, startWidth + deltaX));
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
        alert('네이버 카페 세션이 만료되었습니다. 일회용 로그인 번호로 재로그인해 주세요.');
      }
    } catch (err) {
      console.error('Failed to sync Naver session:', err);
      alert('네이버 카페 세션 상태 동기화 중 에러가 발생했습니다. 브라우저 워커 연결 상태를 확인해 주세요.');
      setNaverSessionStatus('ERROR');
    } finally {
      setVerifyingSession(false);
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
        <div className={`naver-session-status-badge ${getBadgeClass()}`}>
          <div className="naver-session-dot" />
          <span>{getStatusText()}</span>
        </div>

        <div className="naver-session-info">
          <span className="naver-session-label">네이버 카페 세션</span>
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
          >
            <RefreshCw size={12} className={naverSessionStatus === 'CHECKING' ? 'spin' : ''} />
            실시간 검사
          </button>

          {(naverSessionStatus === 'EXPIRED' || naverSessionStatus === 'MISSING' || naverSessionStatus === 'ERROR') && (
            <button
              type="button"
              className="btn-session-action renew"
              onClick={() => window.open('/naver-login', '_blank')}
              title="네이버 세션을 새로 로그인하여 갱신합니다"
            >
              <ExternalLink size={12} />
              세션 갱신
            </button>
          )}
        </div>
      </div>
    );
  };

  // Fetch inquiries for the current page and filter conditions
  const fetchPage = useCallback(async (cursorVal: string | null) => {
    setLoading(true);
    setError(null);
    try {
      // Format start and end date if set
      let startISO: string | undefined = undefined;
      let endISO: string | undefined = undefined;

      if (queryFilters.startDate) {
        startISO = new Date(`${queryFilters.startDate}T00:00:00`).toISOString();
      }
      if (queryFilters.endDate) {
        endISO = new Date(`${queryFilters.endDate}T23:59:59`).toISOString();
      }

      const res = await inquiryApi.searchInquiries({
        userCode: queryFilters.userCode.trim() || undefined,
        status: queryFilters.statuses.length > 0 ? queryFilters.statuses : undefined,
        channel: queryFilters.channels.length > 0 ? queryFilters.channels : undefined,
        start: startISO,
        end: endISO,
        cursor: cursorVal || undefined,
        size: 10,
      });

      setInquiries(res.content);
      setHasNext(res.hasNext);
      setNextCursor(res.nextCursor);
    } catch (err: any) {
      console.error(err);
      setError('데이터를 불러오는 중 문제가 발생했습니다. 백엔드 서버 연결 상태를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [queryFilters]);

  // Load inquiries when filters change or page index changes
  useEffect(() => {
    // Reset cursor stack to Page 1 when search filters change
    setCursorStack([null]);
    setCurrentPage(1);
    fetchPage(null);
  }, [queryFilters, fetchPage]);

  // Auto-select first item when inquiries list loads or changes
  useEffect(() => {
    if (inquiries.length > 0) {
      const exists = inquiries.some(inq => inq.id === selectedInquiryId);
      if (!exists) {
        setSelectedInquiryId(inquiries[0].id);
      }
    } else {
      setSelectedInquiryId(null);
    }
  }, [inquiries, selectedInquiryId]);

  // 앱 마운트 시 현재 로그인 계정 정보 조회 (Nginx X-Remote-User 기반)
  useEffect(() => {
    inquiryApi.getMe()
      .then(setCurrentOperator)
      .catch((err) => {
        console.warn('관리자 계정 정보를 불러오지 못했습니다 (fallback 사용):', err);
        setCurrentOperator({ id: 'unknown', nickname: '알 수 없음', email: '' });
      });
  }, []);

  // Load stats and Naver session status periodically and on mount
  useEffect(() => {
    fetchStats();
    fetchNaverSessionStatus();
  }, [fetchStats, fetchNaverSessionStatus]);

  // Pagination Handlers
  const handleNextPage = () => {
    if (hasNext && nextCursor) {
      // Push next cursor to stack and fetch
      setCursorStack((prev) => [...prev, nextCursor]);
      setCurrentPage((prev) => prev + 1);
      fetchPage(nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      // Pop last cursor from stack
      const newStack = [...cursorStack];
      newStack.pop();
      const prevCursorVal = newStack[newStack.length - 1]; // Top of stack is previous page cursor
      setCursorStack(newStack);
      setCurrentPage((prev) => prev - 1);
      fetchPage(prevCursorVal);
    }
  };

  const handleUpdateInquiry = useCallback((id: string, updatedFields: Partial<CustomerInquiry>) => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, ...updatedFields } : inq))
    );
    fetchStats();
  }, [fetchStats]);

  const handleCreateTicket = async (ticketData: { channel: string; userCode: string; content: string }) => {
    try {
      await inquiryApi.createInquiry({
        channel: ticketData.channel,
        userCode: ticketData.userCode || undefined,
        content: ticketData.content,
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
    });
  };

  const selectedInquiry = inquiries.find(inq => inq.id === selectedInquiryId);

  const renderOperatorWidget = () => {
    const operatorName = currentOperator?.nickname || '계정 확인 중';
    const operatorId = currentOperator?.id || 'loading';
    const operatorEmail = currentOperator?.email || '';
    const isFallbackOperator = currentOperator?.id === 'unknown';
    const title = currentOperator
      ? `현재 로그인: ${operatorName} (${operatorId})`
      : '현재 로그인 계정 확인 중';

    if (isSidebarCollapsed) {
      return (
        <button
          type="button"
          className={`collapsed-tooltip operator-compact ${isFallbackOperator ? 'unknown' : ''}`}
          data-tooltip={title}
          aria-label={title}
        >
          <User size={17} />
        </button>
      );
    }

    return (
      <div className={`operator-widget ${isFallbackOperator ? 'unknown' : ''}`} title={title}>
        <div className="operator-avatar">
          <User size={16} />
        </div>
        <div className="operator-info">
          <span className="operator-label">현재 로그인</span>
          <strong className="operator-name">{operatorName}</strong>
          <span className="operator-meta">{operatorEmail || operatorId}</span>
        </div>
      </div>
    );
  };


  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>
      {/* Left Sidebar */}
      <aside
        className="dashboard-sidebar"
        style={{
          width: isSidebarCollapsed ? '64px' : `${sidebarWidth}px`,
          minWidth: isSidebarCollapsed ? '64px' : undefined,
          padding: isSidebarCollapsed ? '20px 0' : undefined,
          alignItems: isSidebarCollapsed ? 'center' : undefined,
          overflow: isSidebarCollapsed ? 'visible' : 'hidden',
          transition: 'width 0.2s ease'
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

            {renderOperatorWidget()}

            {/* Compact Create Button */}
            <button
              type="button"
              className="btn-primary glow-violet-hover collapsed-tooltip"
              onClick={() => setIsModalOpen(true)}
              data-tooltip="CS 티켓 수동 생성"
              aria-label="CS 티켓 수동 생성"
              style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center', borderRadius: '50%' }}
            >
              <Plus size={18} />
            </button>

            {/* Compact Stats Badges */}
            <StatsCards
              unprocessedCount={unprocessedCount}
              unprocessedHasMore={unprocessedHasMore}
              todayCount={todayCount}
              todayHasMore={todayHasMore}
              isCollapsed
              onUnprocessedClick={handleUnprocessedStatsClick}
              onTodayClick={handleTodayStatsClick}
            />

            {/* Naver Session Dot */}
            {renderNaverSessionWidget()}
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

            {renderOperatorWidget()}

            <StatsCards
              unprocessedCount={unprocessedCount}
              unprocessedHasMore={unprocessedHasMore}
              todayCount={todayCount}
              todayHasMore={todayHasMore}
              onUnprocessedClick={handleUnprocessedStatsClick}
              onTodayClick={handleTodayStatsClick}
            />

            {renderNaverSessionWidget()}

            {/* CS 티켓 수동 생성 — 하단 고정 */}
            <button
              type="button"
              className="btn-primary glow-violet-hover"
              onClick={() => setIsModalOpen(true)}
              style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', flexShrink: 0 }}
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
          padding: isListCollapsed ? '20px 0' : undefined,
          alignItems: isListCollapsed ? 'center' : undefined,
          overflow: 'hidden',
          transition: 'width 0.2s ease'
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
                fontSize: '12px',
                fontWeight: '700',
                flexShrink: 0
              }}
              title={`로드된 문의: ${inquiries.length}건`}
            >
              {inquiries.length}
            </div>
          </div>

        ) : (
          /* ── Expanded List Column ── */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                문의 검색 및 필터
              </span>
              <button
                type="button"
                onClick={() => setIsListCollapsed(true)}
                className="panel-toggle-btn"
                title="목록 접기"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Filter Bar Component with Bottom Border */}
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', flexShrink: 0, width: '100%' }}>
              <FilterBar
                initialValues={queryFilters}
                onSearch={setQueryFilters}
              />
            </div>

            {/* Scrollable list area — flex:1 so it fills remaining height */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', minHeight: 0, width: '100%' }}>
              {/* Error Message */}
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

              {/* Inquiry List */}
              <InquiryList
                inquiries={inquiries}
                loading={loading}
                selectedInquiryId={selectedInquiryId}
                onSelectInquiry={setSelectedInquiryId}
              />
            </div>

            {/* Pagination Controls — always at the bottom, never scrolls */}
            {inquiries.length > 0 && !loading && (
              <div style={{ flexShrink: 0, paddingTop: '8px', borderTop: '1px solid var(--border-light)', width: '100%' }}>
                <Pagination
                  currentPage={currentPage}
                  hasNext={hasNext}
                  onPrev={handlePrevPage}
                  onNext={handleNextPage}
                  loading={loading}
                />
              </div>
            )}
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
    </div>
  );
};

export default App;
