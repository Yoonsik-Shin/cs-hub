import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { InquiryStatus } from '../types/inquiry';

export interface FilterValues {
  userCode: string;
  statuses: InquiryStatus[];
  channels: string[];
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
  const [statuses, setStatuses] = useState<InquiryStatus[]>(initialValues.statuses);
  const [channels, setChannels] = useState<string[]>(initialValues.channels);
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [endDate, setEndDate] = useState(initialValues.endDate);

  const statusOptions: { value: InquiryStatus; label: string }[] = [
    { value: 'OPEN', label: '미처리' },
    { value: 'IN_PROGRESS', label: '진행중' },
    { value: 'RESOLVED', label: '완료' },
  ];

  const channelOptions = [
    { value: 'GOOGLE_SHEET', label: '구글시트' },
    { value: 'NAVER_CAFE', label: '네이버카페' },
    { value: 'EMAIL', label: '이메일' },
    { value: 'KAKAO', label: '카카오톡' },
    { value: 'MANUAL', label: '수동' },
  ];

  // Keep internal states synced if parent values change
  useEffect(() => {
    setUserCode(initialValues.userCode);
    setStatuses(initialValues.statuses);
    setChannels(initialValues.channels);
    setStartDate(initialValues.startDate);
    setEndDate(initialValues.endDate);
  }, [initialValues]);

  const toggleValue = <T extends string>(values: T[], value: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const handleSearch = () => {
    onSearch({
      userCode,
      statuses,
      channels,
      startDate,
      endDate,
    });
  };

  const handleReset = () => {
    const cleared: FilterValues = {
      userCode: '',
      statuses: [],
      channels: [],
      startDate: '',
      endDate: '',
    };
    setUserCode(cleared.userCode);
    setStatuses(cleared.statuses);
    setChannels(cleared.channels);
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
    <div className="filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, width: '100%', overflow: 'hidden' }}>
      {/* Row 1: Search & Actions */}
      <div className="filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
        {/* User Code Search */}
        <div className="filter-group search" style={{ flex: '1', minWidth: '140px' }}>
          <label className="filter-label">유저코드</label>
          <div className="search-input-wrapper" style={{ height: '30px', position: 'relative', width: '100%' }}>
            <Search className="search-icon" style={{ left: '8px', width: '12px', height: '12px' }} />
            <input
              type="text"
              className="search-input"
              placeholder="검색..."
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ padding: '6px 8px 6px 26px', fontSize: '13px', height: '30px', width: '100%' }}
            />
          </div>
        </div>

        {/* Actions (Search & Reset Buttons) */}
        <div 
          className="filter-group actions" 
          style={{ 
            marginLeft: 'auto', 
            display: 'flex', 
            gap: '6px', 
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: '4px'
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              height: '30px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="필터 초기화"
          >
            <RotateCcw size={12} />
            초기화
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSearch}
            style={{ 
              padding: '6px 14px', 
              borderRadius: '6px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            조회
          </button>
        </div>
      </div>

      {/* Row 2: Channel & Status Multi Select */}
      <div className="filter-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', width: '100%' }}>
        <div className="filter-group channel">
          <label className="filter-label">채널</label>
          <div className="multi-filter-group">
            {channelOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`multi-filter-chip ${channels.includes(option.value) ? 'selected' : ''}`}
                onClick={() => toggleValue(channels, option.value, setChannels)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group status">
          <label className="filter-label">상태</label>
          <div className="multi-filter-group">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`multi-filter-chip status-${option.value.toLowerCase()} ${statuses.includes(option.value) ? 'selected' : ''}`}
                onClick={() => toggleValue(statuses, option.value, setStatuses)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Date Picker */}
      <div className="filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
        <div className="filter-group date" style={{ minWidth: '180px', flex: '2' }}>
          <label className="filter-label">날짜 범위</label>
          <div className="date-range-inputs" style={{ gap: '4px', display: 'flex', alignItems: 'center', width: '100%' }}>
            <input
              type="date"
              className="date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '4px 6px', fontSize: '12px', height: '30px', flex: 1, minWidth: '80px', width: '100%' }}
            />
            <span className="date-separator" style={{ fontSize: '12px' }}>~</span>
            <input
              type="date"
              className="date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '4px 6px', fontSize: '12px', height: '30px', flex: 1, minWidth: '80px', width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
