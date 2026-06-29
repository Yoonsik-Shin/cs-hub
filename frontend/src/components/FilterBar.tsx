import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { InquiryStatus } from '../types/inquiry';

export interface FilterValues {
  userCode: string;
  statuses: InquiryStatus[];
  channels: string[];
  startDate: string;
  endDate: string;
  isManual: boolean | undefined;
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
  const [isManual, setIsManual] = useState<boolean | undefined>(initialValues.isManual);

  const statusOptions: { value: InquiryStatus; label: string }[] = [
    { value: 'OPEN', label: '미처리' },
    { value: 'IN_PROGRESS', label: '진행중' },
    { value: 'RESOLVED', label: '완료' },
  ];

  const channelOptions = [
    { value: 'EMAIL', label: '이메일' },
    { value: 'PHONE', label: '전화' },
    { value: 'GOOGLE_SHEET', label: '구글시트' },
    { value: 'NAVER_CAFE', label: '네이버카페' },
  ];

  // Keep internal states synced if parent values change
  useEffect(() => {
    setUserCode(initialValues.userCode);
    setStatuses(initialValues.statuses);
    setChannels(initialValues.channels);
    setStartDate(initialValues.startDate);
    setEndDate(initialValues.endDate);
    setIsManual(initialValues.isManual);
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
      isManual,
    });
  };

  const handleReset = () => {
    const cleared: FilterValues = {
      userCode: '',
      statuses: [],
      channels: [],
      startDate: '',
      endDate: '',
      isManual: undefined,
    };
    setUserCode(cleared.userCode);
    setStatuses(cleared.statuses);
    setChannels(cleared.channels);
    setStartDate(cleared.startDate);
    setEndDate(cleared.endDate);
    setIsManual(cleared.isManual);
    
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
      {/* Row 1: Channel & Status Multi Select */}
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

      {/* Row 2: Date Picker & Creation Type */}
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
        <div className="filter-group creation-type" style={{ minWidth: '140px', flex: '1' }}>
          <label className="filter-label">생성 방식</label>
          <div className="multi-filter-group" style={{ display: 'flex', gap: '2px', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-light)', height: '30px', alignItems: 'center' }}>
            {[
              { value: undefined, label: '전체' },
              { value: false, label: '자동' },
              { value: true, label: '수동' }
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setIsManual(opt.value)}
                style={{ 
                  flex: 1, 
                  padding: '4px 6px', 
                  fontSize: '11px', 
                  borderRadius: '6px',
                  border: 'none',
                  background: isManual === opt.value ? 'var(--accent-indigo)' : 'transparent',
                  color: isManual === opt.value ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: isManual === opt.value ? '600' : '400',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '24px'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Search & Actions */}
      <div className="filter-row" style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', width: '100%', flexWrap: 'nowrap' }}>
        <div className="filter-group search" style={{ flex: '1', minWidth: '100px' }}>
          <label className="filter-label">
            유저코드
            <span style={{ fontSize: '10px', fontWeight: '500', color: userCode.length === 12 ? 'var(--accent-indigo)' : 'var(--text-muted)', marginLeft: '4px' }}>
              ({userCode.length}/12)
            </span>
          </label>
          <div className="search-input-wrapper" style={{ height: '30px', position: 'relative', width: '100%' }}>
            <Search className="search-icon" style={{ left: '6px', width: '11px', height: '11px' }} />
            <input
              type="text"
              className="search-input"
              placeholder="검색..."
              value={userCode}
              onChange={(e) => {
                const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                setUserCode(onlyNums.slice(0, 12));
              }}
              onKeyDown={handleKeyDown}
              style={{ padding: '6px 10px 6px 20px', fontSize: '12px', height: '30px', width: '100%', letterSpacing: '0.2px' }}
            />
          </div>
        </div>

        {/* Actions (Search & Reset Buttons) */}
        <div 
          className="filter-group actions" 
          style={{ 
            display: 'flex', 
            gap: '4px', 
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: '4px',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '3px',
              padding: '6px 8px',
              borderRadius: '6px',
              height: '30px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
            title="필터 초기화"
          >
            <RotateCcw size={11} />
            초기화
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSearch}
            style={{ 
              padding: '6px 10px', 
              borderRadius: '6px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none',
              fontSize: '11px',
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
