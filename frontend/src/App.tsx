import React, { useState, useEffect, useCallback } from 'react';
import { StatsCards } from './components/StatsCards';
import { FilterBar } from './components/FilterBar';
import type { FilterValues } from './components/FilterBar';
import { InquiryList } from './components/InquiryList';
import { Pagination } from './components/Pagination';
import { CreateTicketModal } from './components/CreateTicketModal';
import { inquiryApi } from './api/inquiryApi';
import type { CustomerInquiry } from './types/inquiry';
import { Plus, RefreshCw, ExternalLink } from 'lucide-react';
import { NaverLoginRenewPage } from './components/NaverLoginRenewPage';

export const App: React.FC = () => {
  const isNaverLogin = window.location.pathname === '/naver-login';

  if (isNaverLogin) {
    return <NaverLoginRenewPage />;
  }

  // Naver Session states
  const [naverSessionStatus, setNaverSessionStatus] = useState<'ACTIVE' | 'EXPIRED' | 'MISSING' | 'CHECKING' | 'ERROR'>('CHECKING');
  const [naverSessionUpdatedAt, setNaverSessionUpdatedAt] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);

  // Query Filter states
  const [queryFilters, setQueryFilters] = useState<FilterValues>({
    userCode: '',
    status: undefined,
    channel: '',
    startDate: '',
    endDate: '',
  });

  // Pagination states (Cursor Stack for page-like navigation)
  // cursorStack holds the starting cursor for each page. Page 1 starts with null.
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);

  // Data states
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats states
  const [unprocessedCount, setUnprocessedCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch stats (unprocessed count and today's new count)
  const fetchStats = useCallback(async () => {
    try {
      // 1. Fetch unprocessed count (status: OPEN or IN_PROGRESS)
      const openRes = await inquiryApi.searchInquiries({ status: 'OPEN', size: 100 });
      const progressRes = await inquiryApi.searchInquiries({ status: 'IN_PROGRESS', size: 100 });
      const totalUnprocessed = openRes.content.length + progressRes.content.length;
      setUnprocessedCount(totalUnprocessed);

      // 2. Fetch today's count (createdAt >= start of today in KST/local)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today.toISOString();
      const todayRes = await inquiryApi.searchInquiries({ start: startOfToday, size: 100 });
      setTodayCount(todayRes.content.length);
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

  // Validate Naver Cafe Session in Real-time
  const handleValidateNaverSession = async () => {
    if (verifyingSession) return;
    setVerifyingSession(true);
    setNaverSessionStatus('CHECKING');
    try {
      const result = await inquiryApi.validateNaverSession();
      setNaverSessionStatus(result.status);
      setNaverSessionUpdatedAt(result.updatedAt);
      if (result.valid) {
        alert('네이버 카페 세션이 유효합니다 (정상).');
      } else {
        alert('네이버 카페 세션이 만료되었습니다. 일회용 로그인 번호로 재로그인해 주세요.');
      }
    } catch (err) {
      console.error('Failed to validate Naver session:', err);
      alert('네이버 카페 세션 검사 중 에러가 발생했습니다. 브라우저 워커 연결 상태를 확인해 주세요.');
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

    return (
      <div className="naver-session-widget">
        <div className={`naver-session-status-badge ${getBadgeClass()}`}>
          <div className="naver-session-dot" />
          <span>{getStatusText()}</span>
        </div>

        <div className="naver-session-info">
          <span className="naver-session-label">네이버 세션 (Cafe 자동화)</span>
          <span className="naver-session-time">
            마지막 확인: {formatTime(naverSessionUpdatedAt)}
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
        status: queryFilters.status,
        channel: queryFilters.channel || undefined,
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

  // Ticket creation handler (connected to backend API)
  const handleCreateTicket = async (ticketData: { channel: string; userCode: string; content: string }) => {
    try {
      await inquiryApi.createInquiry(ticketData);
      
      // Reload stats and reload the first page from the API!
      fetchStats();
      fetchPage(null);
    } catch (err) {
      console.error('Failed to create ticket:', err);
      alert('CS 티켓 생성에 실패했습니다. 입력값을 확인해 주세요.');
    }
  };

  // In-place silent update handler for single inquiry properties
  const handleUpdateInquiry = useCallback((id: string, updatedFields: Partial<CustomerInquiry>) => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, ...updatedFields } : inq))
    );
    fetchStats();
  }, [fetchStats]);


  return (
    <div className="dashboard-container">
      {/* Dashboard Top Header */}
      <header className="dashboard-header">
        <div className="dashboard-title-area">
          <h1 className="gradient-text">Admin CS 통합뷰</h1>
          <p>카카오 채널, 네이버 카페 등 다양한 경로로 들어온 모든 문의 사항을 모아봅니다.</p>
        </div>
        {renderNaverSessionWidget()}
        <button 
          type="button" 
          className="btn-primary glow-violet-hover"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={16} />
          CS 티켓 수동 생성
        </button>
      </header>

      {/* Stats Cards Section */}
      <StatsCards 
        unprocessedCount={unprocessedCount} 
        todayCount={todayCount} 
      />

      {/* Filter Bar Component */}
      <FilterBar
        initialValues={queryFilters}
        onSearch={setQueryFilters}
      />

      {/* Error Message */}
      {error && (
        <div 
          style={{ 
            padding: '16px', 
            background: 'rgba(239, 68, 68, 0.12)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '12px', 
            color: '#f87171',
            fontSize: '14px',
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
        onUpdateInquiry={handleUpdateInquiry}
        onRefresh={() => {
          fetchStats();
          fetchPage(cursorStack[cursorStack.length - 1]);
        }}
      />

      {/* Pagination Controls */}
      {inquiries.length > 0 && !loading && (
        <Pagination
          currentPage={currentPage}
          hasNext={hasNext}
          onPrev={handlePrevPage}
          onNext={handleNextPage}
          loading={loading}
        />
      )}

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
