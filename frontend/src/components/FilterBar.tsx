import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Filter, ChevronDown, ChevronUp, Save } from 'lucide-react';
import type { CustomFilterEntity, InquiryStatus } from '../types/inquiry';

export interface FilterValues {
  userCode: string;
  statuses: InquiryStatus[];
  channels: string[];
  startDate: string;
  endDate: string;
  isManual: boolean | undefined;
  bookmarkedOnly?: boolean;
}

interface FilterBarProps {
  initialValues: FilterValues;
  onSearch: (values: FilterValues) => void;
  customFilters?: CustomFilterEntity[];
  onSaveCustomFilter?: (name: string, values: FilterValues) => Promise<void>;
  onDeleteCustomFilter?: (id: number) => Promise<void>;
}

const summaryBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  background: '#ffffff',
  border: '1px solid var(--border-light)',
  borderRadius: '6px',
  fontSize: '11px',
  lineHeight: '1.2',
  height: '22px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  whiteSpace: 'nowrap',
  flexShrink: 0
};

const summaryBadgeLabelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontWeight: 700,
  fontSize: '9.5px',
  textTransform: 'uppercase',
  letterSpacing: '0.2px',
  whiteSpace: 'nowrap'
};

const summaryBadgeValueStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 600,
  whiteSpace: 'nowrap'
};

export const FilterBar: React.FC<FilterBarProps> = ({
  initialValues,
  onSearch,
  customFilters = [],
  onSaveCustomFilter,
  onDeleteCustomFilter,
}) => {
  // Local temporary states for each filter control
  const [userCode, setUserCode] = useState(initialValues.userCode);
  const [statuses, setStatuses] = useState<InquiryStatus[]>(initialValues.statuses);
  const [channels, setChannels] = useState<string[]>(initialValues.channels);
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [endDate, setEndDate] = useState(initialValues.endDate);
  const [isManual, setIsManual] = useState<boolean | undefined>(initialValues.isManual);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(Boolean(initialValues.bookmarkedOnly));
  const [savingFilter, setSavingFilter] = useState(false);

  // Collapse State (Default: true for compactness)
  const [isCollapsed, setIsCollapsed] = useState(true);

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
    setBookmarkedOnly(Boolean(initialValues.bookmarkedOnly));
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
      bookmarkedOnly,
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
      bookmarkedOnly: false,
    };
    setUserCode(cleared.userCode);
    setStatuses(cleared.statuses);
    setChannels(cleared.channels);
    setStartDate(cleared.startDate);
    setEndDate(cleared.endDate);
    setIsManual(cleared.isManual);
    setBookmarkedOnly(false);
    
    // Automatically trigger search with cleared filters
    onSearch(cleared);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Check if any filters are currently active (non-default values)
  const hasActiveFilters = 
    userCode.trim() !== '' ||
    statuses.length > 0 ||
    channels.length > 0 ||
    startDate !== '' ||
    endDate !== '' ||
    isManual !== undefined ||
    bookmarkedOnly;

  const currentValues = (): FilterValues => ({
    userCode,
    statuses,
    channels,
    startDate,
    endDate,
    isManual,
    bookmarkedOnly,
  });

  const applyFilter = (values: Partial<FilterValues>) => {
    const next: FilterValues = {
      userCode: values.userCode || '',
      statuses: values.statuses || [],
      channels: values.channels || [],
      startDate: values.startDate || '',
      endDate: values.endDate || '',
      isManual: values.isManual,
      bookmarkedOnly: Boolean(values.bookmarkedOnly),
    };
    setUserCode(next.userCode);
    setStatuses(next.statuses);
    setChannels(next.channels);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setIsManual(next.isManual);
    setBookmarkedOnly(Boolean(next.bookmarkedOnly));
    onSearch(next);
  };

  const handleSaveCurrentFilter = async () => {
    if (!onSaveCustomFilter || savingFilter) return;
    const name = window.prompt('저장할 필터 이름을 입력해 주세요.');
    if (!name || !name.trim()) return;

    setSavingFilter(true);
    try {
      await onSaveCustomFilter(name.trim(), currentValues());
    } catch (err: any) {
      alert('필터 저장에 실패했습니다: ' + err.message);
    } finally {
      setSavingFilter(false);
    }
  };

  const handleDeleteFilter = async (id: number) => {
    if (!onDeleteCustomFilter) return;
    if (!window.confirm('저장된 필터를 삭제할까요?')) return;
    try {
      await onDeleteCustomFilter(id);
    } catch (err: any) {
      alert('필터 삭제에 실패했습니다: ' + err.message);
    }
  };

  const renderSummaryBadges = () => {
    const badges: React.ReactNode[] = [];

    // 1. Channels
    if (channels.length > 0) {
      const channelLabels = channels
        .map((c) => channelOptions.find((o) => o.value === c)?.label || c)
        .join(', ');
      badges.push(
        <div key="channels" style={summaryBadgeStyle}>
          <span style={summaryBadgeLabelStyle}>채널</span>
          <span style={summaryBadgeValueStyle}>{channelLabels}</span>
        </div>
      );
    }

    // 2. Statuses
    if (statuses.length > 0) {
      statuses.forEach((s) => {
        const option = statusOptions.find((o) => o.value === s);
        if (option) {
          // Map to custom theme colors
          let color = 'var(--status-resolved)';
          let bg = 'rgba(100, 116, 139, 0.08)';
          let border = 'var(--status-resolved-border)';

          if (s === 'OPEN') {
            color = 'var(--status-open)';
            bg = 'var(--status-open-bg)';
            border = 'var(--status-open-border)';
          } else if (s === 'IN_PROGRESS') {
            color = 'var(--status-inprogress)';
            bg = 'var(--status-inprogress-bg)';
            border = 'var(--status-inprogress-border)';
          }

          badges.push(
            <div 
              key={`status-${s}`} 
              style={{
                ...summaryBadgeStyle,
                color,
                background: bg,
                borderColor: border,
                borderLeftWidth: '3px'
              }}
            >
              <span style={{ ...summaryBadgeLabelStyle, color }}>상태</span>
              <span style={{ ...summaryBadgeValueStyle, color }}>{option.label}</span>
            </div>
          );
        }
      });
    }

    // 3. User Code
    if (userCode.trim() !== '') {
      badges.push(
        <div key="usercode" style={summaryBadgeStyle}>
          <span style={summaryBadgeLabelStyle}>유저코드</span>
          <span style={summaryBadgeValueStyle}>{userCode}</span>
        </div>
      );
    }

    // 4. Creation Type (Manual vs Auto)
    if (isManual !== undefined) {
      badges.push(
        <div key="isManual" style={summaryBadgeStyle}>
          <span style={summaryBadgeLabelStyle}>생성</span>
          <span style={summaryBadgeValueStyle}>{isManual ? '수동' : '자동'}</span>
        </div>
      );
    }

    if (bookmarkedOnly) {
      badges.push(
        <div key="bookmarkedOnly" style={summaryBadgeStyle}>
          <span style={summaryBadgeLabelStyle}>범위</span>
          <span style={summaryBadgeValueStyle}>즐겨찾기</span>
        </div>
      );
    }

    // 5. Date Range
    if (startDate !== '' || endDate !== '') {
      const dateText = `${startDate || '전체'} ~ ${endDate || '전체'}`;
      badges.push(
        <div key="dates" style={summaryBadgeStyle}>
          <span style={summaryBadgeLabelStyle}>기간</span>
          <span style={summaryBadgeValueStyle}>{dateText}</span>
        </div>
      );
    }

    if (badges.length === 0) {
      return (
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 500 }}>
          적용된 필터 없음 (전체 조회 중)
        </span>
      );
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', width: '100%' }}>
        {badges}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div 
        className="filter-bar collapsed" 
        onClick={() => setIsCollapsed(false)}
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px', 
          background: 'rgba(99, 102, 241, 0.02)', 
          border: '1px solid var(--border-light)', 
          borderRadius: '10px', 
          padding: '10px 12px', 
          width: '100%', 
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
          userSelect: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.02)';
          e.currentTarget.style.borderColor = 'var(--border-light)';
        }}
      >
        {/* Header Row: Title & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} style={{ color: 'var(--accent-indigo)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>필터 검색</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '3px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  height: '26px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  border: '1px solid var(--border-light)',
                  background: '#ffffff',
                  fontWeight: 600
                }}
                title="필터 초기화"
              >
                <RotateCcw size={10} />
                초기화
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsCollapsed(false)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                height: '26px',
                cursor: 'pointer',
                fontSize: '11px',
                border: '1px solid var(--border-light)',
                background: '#ffffff',
                fontWeight: 600
              }}
            >
              필터 설정
              <ChevronDown size={12} />
            </button>
          </div>
        </div>

        {/* Badges Row (Visible only if active filters are present) */}
        {hasActiveFilters && (
          <div 
            style={{ 
              width: '100%', 
              borderTop: '1px dashed var(--border-light)', 
              paddingTop: '8px', 
              marginTop: '2px'
            }}
          >
            {renderSummaryBadges()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch', background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '12px', width: '100%', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      {/* Expanded view header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-light)', paddingBottom: '6px', marginBottom: '2px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={13} style={{ color: 'var(--accent-indigo)' }} />
          <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)' }}>상세 필터 설정</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {customFilters.length > 0 && (
            <select
              className="select-input"
              defaultValue=""
              onChange={(e) => {
                const selected = customFilters.find((filter) => String(filter.id) === e.target.value);
                if (selected) {
                  applyFilter(selected.filterData as Partial<FilterValues>);
                }
                e.currentTarget.value = '';
              }}
              style={{ height: '30px', width: '132px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}
              title="저장된 필터 적용"
            >
              <option value="">저장 필터 적용</option>
              {customFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>{filter.name}</option>
              ))}
            </select>
          )}
          {onSaveCustomFilter && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSaveCurrentFilter}
              disabled={savingFilter}
              title="현재 조건 필터로 저장"
              style={{
                height: '30px',
                padding: '0 10px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: savingFilter ? 'wait' : 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: 'var(--accent-indigo)',
                background: 'rgba(79, 70, 229, 0.06)',
                border: '1px solid rgba(79, 70, 229, 0.18)'
              }}
            >
              <Save size={12} />
              현재 필터 저장
            </button>
          )}
          {customFilters.length > 0 && onDeleteCustomFilter && (
            <select
              className="select-input"
              defaultValue=""
              onChange={(e) => {
                const id = Number(e.target.value);
                if (id) {
                  handleDeleteFilter(id);
                }
                e.currentTarget.value = '';
              }}
              style={{ height: '30px', width: '116px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}
              title="저장된 필터 삭제"
              aria-label="저장된 필터 삭제"
            >
              <option value="">필터 삭제</option>
              {customFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>{filter.name}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--accent-indigo)'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            필터 접기
            <ChevronUp size={12} />
          </button>
        </div>
      </div>

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
        <div className="filter-group bookmark-type" style={{ minWidth: '120px', flex: '1' }}>
          <label className="filter-label">즐겨찾기</label>
          <button
            type="button"
            onClick={() => setBookmarkedOnly((prev) => !prev)}
            className={`multi-filter-chip ${bookmarkedOnly ? 'selected' : ''}`}
            style={{ height: '30px', width: '100%', justifyContent: 'center', color: bookmarkedOnly ? 'var(--accent-amber)' : undefined }}
          >
            {bookmarkedOnly ? '즐겨찾기만' : '전체 포함'}
          </button>
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
