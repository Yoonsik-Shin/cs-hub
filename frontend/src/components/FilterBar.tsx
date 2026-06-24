import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { InquiryStatus } from '../types/inquiry';

export interface FilterValues {
  userCode: string;
  status: InquiryStatus | undefined;
  channel: string;
  startDate: string;
  endDate: string;
}

interface FilterBarProps {
  initialValues: FilterValues;
  onSearch: (values: FilterValues) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  initialValues,
  onSearch,
}) => {
  // Local temporary states for each filter control
  const [userCode, setUserCode] = useState(initialValues.userCode);
  const [status, setStatus] = useState<InquiryStatus | undefined>(initialValues.status);
  const [channel, setChannel] = useState(initialValues.channel);
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [endDate, setEndDate] = useState(initialValues.endDate);

  // Keep internal states synced if parent values change
  useEffect(() => {
    setUserCode(initialValues.userCode);
    setStatus(initialValues.status);
    setChannel(initialValues.channel);
    setStartDate(initialValues.startDate);
    setEndDate(initialValues.endDate);
  }, [initialValues]);

  const handleSearch = () => {
    onSearch({
      userCode,
      status,
      channel,
      startDate,
      endDate,
    });
  };

  const handleReset = () => {
    const cleared: FilterValues = {
      userCode: '',
      status: undefined,
      channel: '',
      startDate: '',
      endDate: '',
    };
    setUserCode(cleared.userCode);
    setStatus(cleared.status);
    setChannel(cleared.channel);
    setStartDate(cleared.startDate);
    setEndDate(cleared.endDate);
    
    // Automatically trigger search with cleared filters
    onSearch(cleared);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="filter-bar glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'stretch' }}>
      {/* Row 1: Other Filters (Status, Date, Channel) */}
      <div className="filter-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', width: '100%' }}>
        {/* Status Segmented Control */}
        <div className="filter-group status" style={{ minWidth: '320px', flex: '1.5' }}>
          <label className="filter-label">처리 상태</label>
          <div className="tabs-container">
            <button
              type="button"
              className={`tab-btn ${status === undefined ? 'active' : ''}`}
              onClick={() => setStatus(undefined)}
            >
              전체
            </button>
            <button
              type="button"
              className={`tab-btn ${status === 'OPEN' ? 'active' : ''}`}
              onClick={() => setStatus('OPEN')}
            >
              미처리
            </button>
            <button
              type="button"
              className={`tab-btn ${status === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => setStatus('IN_PROGRESS')}
            >
              진행중
            </button>
            <button
              type="button"
              className={`tab-btn ${status === 'RESOLVED' ? 'active' : ''}`}
              onClick={() => setStatus('RESOLVED')}
            >
              처리완료
            </button>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="filter-group date" style={{ minWidth: '280px', flex: '1.5' }}>
          <label className="filter-label">날짜 범위</label>
          <div className="date-range-inputs">
            <input
              type="date"
              className="date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="date-separator">~</span>
            <input
              type="date"
              className="date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Channel Filter */}
        <div className="filter-group channel" style={{ minWidth: '200px', flex: '1' }}>
          <label className="filter-label">채널</label>
          <select
            className="select-input"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="">전체 채널</option>
            <option value="GOOGLE_SHEET">GOOGLE_SHEET (구글 시트)</option>
            <option value="NAVER_CAFE">NAVER_CAFE (네이버 카페)</option>
            <option value="KAKAO">KAKAO (카카오톡)</option>
            <option value="MANUAL">MANUAL (수동)</option>
          </select>
        </div>
      </div>

      {/* Row 2: User Code Search & Actions */}
      <div className="filter-row" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
        {/* User Code Search */}
        <div className="filter-group search" style={{ flex: 1, minWidth: '200px' }}>
          <label className="filter-label">유저코드 검색</label>
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="유저코드 입력..."
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Actions (Search & Reset Buttons) */}
        <div 
          className="filter-group actions" 
          style={{ 
            marginLeft: 'auto', 
            display: 'flex', 
            gap: '8px', 
            flexDirection: 'row'
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              height: '42px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <RotateCcw size={14} />
            초기화
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSearch}
            style={{ 
              padding: '10px 24px', 
              borderRadius: '10px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            조회
          </button>
        </div>
      </div>
    </div>
  );
};
