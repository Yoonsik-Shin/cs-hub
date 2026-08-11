import React, { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw, Filter, ChevronDown, ChevronUp, Save, Trash2, Plus, X, Edit2, Check } from 'lucide-react';
import type { CustomFilterEntity, InquiryStatus } from '../types/inquiry';
import {
  getChannelPresentation,
  getStatusLabel,
  INQUIRY_STATUSES,
  normalizeUserCode,
  USER_CODE_LENGTH,
} from '../features/inquiry/policy';
import { useFeedback } from './ui/feedbackContext';
import { getErrorMessage } from '../lib/errors';

export interface FilterValues {
  userCode: string;
  userCodeMissing?: boolean;
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
  const { notify, requestConfirmation } = useFeedback();
  // Local temporary states for each filter control
  const [userCode, setUserCode] = useState(initialValues.userCode);
  const [userCodeMissing, setUserCodeMissing] = useState(Boolean(initialValues.userCodeMissing));
  const [statuses, setStatuses] = useState<InquiryStatus[]>(initialValues.statuses);
  const [channels, setChannels] = useState<string[]>(initialValues.channels);
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [endDate, setEndDate] = useState(initialValues.endDate);
  const [isManual, setIsManual] = useState<boolean | undefined>(initialValues.isManual);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(Boolean(initialValues.bookmarkedOnly));
  const [savingFilter, setSavingFilter] = useState(false);

  // Collapse State (Default: true for compactness)
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Active custom filter ID state
  const [selectedFilterId, setSelectedFilterId] = useState<number | string | ''>('');
  const pendingSelectName = useRef<string>('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [isEditingFilter, setIsEditingFilter] = useState(false);
  const [previousInitialValues, setPreviousInitialValues] = useState(initialValues);

  const defaultPresets = [
    { id: 'default-all', name: '📢 전체 문의', filterData: { userCode: '', userCodeMissing: false, statuses: [], channels: [], startDate: '', endDate: '', isManual: undefined, bookmarkedOnly: false } },
    { id: 'default-open', name: `🔴 ${getStatusLabel('OPEN')} 문의`, filterData: { userCode: '', userCodeMissing: false, statuses: ['OPEN'], channels: [], startDate: '', endDate: '', isManual: undefined, bookmarkedOnly: false } },
    { id: 'default-in_progress', name: `🟡 ${getStatusLabel('IN_PROGRESS')} 문의`, filterData: { userCode: '', userCodeMissing: false, statuses: ['IN_PROGRESS'], channels: [], startDate: '', endDate: '', isManual: undefined, bookmarkedOnly: false } },
    { id: 'default-resolved', name: `🟢 ${getStatusLabel('RESOLVED')} 문의`, filterData: { userCode: '', userCodeMissing: false, statuses: ['RESOLVED'], channels: [], startDate: '', endDate: '', isManual: undefined, bookmarkedOnly: false } },
    { id: 'default-user-code-missing', name: '⚪ 유저코드 없음', filterData: { userCode: '', userCodeMissing: true, statuses: [], channels: [], startDate: '', endDate: '', isManual: undefined, bookmarkedOnly: false } },
    { id: 'default-bookmarked', name: '⭐ 즐겨찾기 문의', filterData: { userCode: '', userCodeMissing: false, statuses: [], channels: [], startDate: '', endDate: '', isManual: undefined, bookmarkedOnly: true } }
  ];

  const statusOptions: { value: InquiryStatus; label: string }[] = INQUIRY_STATUSES.map((value) => ({
    value,
    label: getStatusLabel(value),
  }));

  const channelOptions = [
    'EMAIL',
    'PHONE',
    'GOOGLE_SHEET',
    'NAVER_CAFE',
  ].map((value) => ({
    value,
    label: getChannelPresentation(value).label,
  }));

  // Guarded render-time adjustment keeps the local draft aligned without a stale effect render.
  if (previousInitialValues !== initialValues) {
    setPreviousInitialValues(initialValues);
    setUserCode(initialValues.userCode);
    setUserCodeMissing(Boolean(initialValues.userCodeMissing));
    setStatuses(initialValues.statuses);
    setChannels(initialValues.channels);
    setStartDate(initialValues.startDate);
    setEndDate(initialValues.endDate);
    setIsManual(initialValues.isManual);
    setBookmarkedOnly(Boolean(initialValues.bookmarkedOnly));
  }

  // Automatically select newly created custom filter
  useEffect(() => {
    if (pendingSelectName.current) {
      const found = customFilters.find(f => f.name === pendingSelectName.current);
      if (found) {
        setSelectedFilterId(found.id);
        pendingSelectName.current = '';
      }
    }
  }, [customFilters]);

  if (!isEditingFilter) {
    const matchedFilter = customFilters.find((filter) => {
      const data = filter.filterData || {};
      return (
        JSON.stringify(data.channels || []) === JSON.stringify(channels) &&
        JSON.stringify(data.statuses || []) === JSON.stringify(statuses) &&
        (data.startDate || '') === startDate &&
        (data.endDate || '') === endDate &&
        data.isManual === isManual &&
        Boolean(data.bookmarkedOnly) === bookmarkedOnly &&
        Boolean(data.userCodeMissing) === userCodeMissing &&
        (data.userCode || '') === userCode
      );
    });
    const matchedPreset = defaultPresets.find((preset) => {
      const data = preset.filterData;
      return (
        JSON.stringify(data.channels || []) === JSON.stringify(channels) &&
        JSON.stringify(data.statuses || []) === JSON.stringify(statuses) &&
        (data.startDate || '') === startDate &&
        (data.endDate || '') === endDate &&
        data.isManual === isManual &&
        Boolean(data.bookmarkedOnly) === bookmarkedOnly &&
        Boolean(data.userCodeMissing) === userCodeMissing &&
        (data.userCode || '') === userCode
      );
    });
    const matchedFilterId = matchedFilter?.id ?? matchedPreset?.id ?? '';
    if (selectedFilterId !== matchedFilterId) {
      setSelectedFilterId(matchedFilterId);
    }
  }

  const toggleValue = <T extends string>(values: T[], value: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const handleSearch = () => {
    onSearch({
      userCode,
      userCodeMissing,
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
      userCodeMissing: false,
    };
    setUserCode(cleared.userCode);
    setUserCodeMissing(false);
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
    bookmarkedOnly ||
    userCodeMissing;

  const currentValues = (): FilterValues => ({
    userCode,
    userCodeMissing,
    statuses,
    channels,
    startDate,
    endDate,
    isManual,
    bookmarkedOnly,
  });

  const applyFilter = (values: Partial<FilterValues>, id?: number | string) => {
    const next: FilterValues = {
      userCode: values.userCode || '',
      userCodeMissing: Boolean(values.userCodeMissing),
      statuses: values.statuses || [],
      channels: values.channels || [],
      startDate: values.startDate || '',
      endDate: values.endDate || '',
      isManual: values.isManual,
      bookmarkedOnly: Boolean(values.bookmarkedOnly),
    };
    setUserCode(next.userCode);
    setUserCodeMissing(Boolean(next.userCodeMissing));
    setStatuses(next.statuses);
    setChannels(next.channels);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setIsManual(next.isManual);
    setBookmarkedOnly(Boolean(next.bookmarkedOnly));
    
    if (id !== undefined) {
      setSelectedFilterId(id);
    }
    
    onSearch(next);
  };

  const handleSaveClick = () => {
    setShowNameInput(true);
    setNewFilterName('');
  };

  const handleSaveConfirm = async () => {
    if (!newFilterName.trim() || !onSaveCustomFilter || savingFilter) return;
    setSavingFilter(true);
    try {
      pendingSelectName.current = newFilterName.trim();
      await onSaveCustomFilter(newFilterName.trim(), currentValues());
      setShowNameInput(false);
    } catch (err) {
      notify('필터 저장에 실패했습니다: ' + getErrorMessage(err), 'error');
    } finally {
      setSavingFilter(false);
    }
  };

  const handleSaveCancel = () => {
    setShowNameInput(false);
  };

  const handleUpdateConfirm = async () => {
    const activeFilter = customFilters.find(f => f.id === selectedFilterId);
    if (!activeFilter || !onSaveCustomFilter || savingFilter) return;
    setSavingFilter(true);
    try {
      await onSaveCustomFilter(activeFilter.name, currentValues());
      setIsEditingFilter(false);
    } catch (err) {
      notify('필터 업데이트에 실패했습니다: ' + getErrorMessage(err), 'error');
    } finally {
      setSavingFilter(false);
    }
  };

  const handleUpdateCancel = () => {
    setIsEditingFilter(false);
    const activeFilter = customFilters.find(f => f.id === selectedFilterId);
    if (activeFilter) {
      applyFilter(activeFilter.filterData as Partial<FilterValues>, activeFilter.id);
    }
  };

  const handleDeleteFilter = async (id: number) => {
    if (!onDeleteCustomFilter) return;
    const confirmed = await requestConfirmation({
      title: '저장된 필터 삭제',
      message: '선택한 필터를 삭제하시겠습니까?',
      confirmLabel: '삭제',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await onDeleteCustomFilter(id);
    } catch (err) {
      notify('필터 삭제에 실패했습니다: ' + getErrorMessage(err), 'error');
    }
  };

  const handleNewFilterClick = () => {
    setSelectedFilterId('');
    setIsEditingFilter(false);
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

    if (userCodeMissing) {
      badges.push(
        <div key="userCodeMissing" style={summaryBadgeStyle}>
          <span style={summaryBadgeLabelStyle}>유저코드</span>
          <span style={summaryBadgeValueStyle}>없음</span>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation(); // Only block propagation on reset click to avoid expanding the bar
                  handleReset();
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '3px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  height: '24px',
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
            <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s', flexShrink: 0 }} />
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-light)', paddingBottom: '6px', marginBottom: '2px', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={13} style={{ color: 'var(--accent-indigo)' }} />
          <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)' }}>상세 필터 설정</span>
        </div>
        <div>
          {/* Collapse Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '4px 8px',
              borderRadius: '6px',
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
            접기
            <ChevronUp size={12} />
          </button>
        </div>
      </div>

      {/* Saved Filters Row (Single Line Layout to prevent horizontal overflow in narrow width) */}
      <div className="filter-row" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
        background: isEditingFilter ? 'rgba(22, 163, 74, 0.04)' : 'rgba(79, 70, 229, 0.04)',
        padding: '6px 8px',
        borderRadius: '8px',
        border: isEditingFilter ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid rgba(79, 70, 229, 0.12)',
        marginBottom: '2px',
        transition: 'all 0.2s',
        boxSizing: 'border-box'
      }}>
        {showNameInput ? (
          <>
            <input
              type="text"
              placeholder="필터 이름 입력..."
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveConfirm();
                if (e.key === 'Escape') handleSaveCancel();
              }}
              autoFocus
              style={{
                flex: 1,
                height: '24px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid var(--accent-indigo)',
                padding: '0 6px',
                outline: 'none',
                minWidth: 0
              }}
            />
            {/* Confirm icon button */}
            <button
              type="button"
              onClick={handleSaveConfirm}
              disabled={savingFilter}
              style={{
                height: '24px',
                width: '24px',
                borderRadius: '4px',
                background: 'var(--accent-indigo)',
                color: '#ffffff',
                border: 'none',
                cursor: savingFilter ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="저장 확인"
            >
              <Check size={12} />
            </button>
            {/* Cancel icon button */}
            <button
              type="button"
              onClick={handleSaveCancel}
              style={{
                height: '24px',
                width: '24px',
                borderRadius: '4px',
                background: '#ffffff',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="저장 취소"
            >
              <X size={12} />
            </button>
          </>
        ) : isEditingFilter ? (
          <>
            <select
              disabled
              value={selectedFilterId}
              style={{
                flex: 1,
                height: '24px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid rgba(22, 163, 74, 0.3)',
                padding: '0 4px',
                background: 'rgba(22, 163, 74, 0.02)',
                color: 'var(--text-primary)',
                cursor: 'not-allowed',
                minWidth: 0
              }}
            >
              {customFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.name} (수정 중)
                </option>
              ))}
            </select>
            {/* Save Update icon button */}
            <button
              type="button"
              onClick={handleUpdateConfirm}
              disabled={savingFilter}
              style={{
                height: '24px',
                width: '24px',
                borderRadius: '4px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                cursor: savingFilter ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="변경된 상세 조건을 이 필터에 덮어쓰기 저장"
            >
              <Check size={12} />
            </button>
            {/* Cancel edit icon button */}
            <button
              type="button"
              onClick={handleUpdateCancel}
              style={{
                height: '24px',
                width: '24px',
                borderRadius: '4px',
                background: '#ffffff',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="필터 수정 취소 및 값 원복"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <select
              value={selectedFilterId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setSelectedFilterId('');
                } else if (val.startsWith('default-')) {
                  setSelectedFilterId(val);
                  const selected = defaultPresets.find(p => p.id === val);
                  if (selected) {
                    applyFilter(selected.filterData as Partial<FilterValues>, val);
                  }
                } else {
                  const numId = Number(val);
                  setSelectedFilterId(numId);
                  const selected = customFilters.find(f => f.id === numId);
                  if (selected) {
                    applyFilter(selected.filterData as Partial<FilterValues>, numId);
                  }
                }
              }}
              style={{
                flex: 1,
                height: '24px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid var(--border-light)',
                padding: '0 4px',
                background: '#ffffff',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                minWidth: 0
              }}
            >
              <option value="">선택 없음</option>
              <optgroup label="기본 필터">
                {defaultPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
              {customFilters.length > 0 && (
                <optgroup label="사용자 지정 필터">
                  {customFilters.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      {filter.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Clear/Deselect icon button when any preset is active */}
            {selectedFilterId !== '' && (
              <button
                type="button"
                onClick={() => setSelectedFilterId('')}
                style={{
                  height: '24px',
                  width: '24px',
                  borderRadius: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title="필터 선택 해제"
              >
                <X size={12} />
              </button>
            )}

            {/* If a custom filter is loaded, show Edit/Delete. Otherwise show Save (New) */}
            {selectedFilterId !== '' && typeof selectedFilterId === 'number' ? (
              <>
                {/* Edit Icon Button */}
                <button
                  type="button"
                  onClick={() => setIsEditingFilter(true)}
                  style={{
                    height: '24px',
                    width: '24px',
                    borderRadius: '4px',
                    background: 'var(--accent-indigo)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="현재 저장 필터 조건 수정하기"
                >
                  <Edit2 size={11} />
                </button>

                {/* Delete icon button */}
                {onDeleteCustomFilter && (
                  <button
                    type="button"
                    onClick={() => handleDeleteFilter(Number(selectedFilterId))}
                    style={{
                      height: '24px',
                      width: '24px',
                      borderRadius: '4px',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                    title="현재 선택된 필터 삭제"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </>
            ) : selectedFilterId === '' ? (
              /* Save icon button (for saving a new filter preset) */
              onSaveCustomFilter && (
                <button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={savingFilter}
                  style={{
                    height: '24px',
                    width: '24px',
                    borderRadius: '4px',
                    background: 'var(--accent-indigo)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="현재 입력된 상세 조건을 새 필터로 저장"
                >
                  <Save size={11} />
                </button>
              )
            ) : null}

            {/* "+" Button to clear selection and reset inputs (create new preset flow) */}
            {selectedFilterId !== '' && (
              <button
                type="button"
                onClick={handleNewFilterClick}
                style={{
                  height: '24px',
                  width: '24px',
                  borderRadius: '4px',
                  background: '#ffffff',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title="새 상세 필터 작성 (선택 해제 및 입력 초기화)"
              >
                <Plus size={12} />
              </button>
            )}
          </>
        )}
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
      </div>

      {/* Row 3: Search & Actions */}
      <div className="filter-row" style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', width: '100%', flexWrap: 'nowrap' }}>
        <div className="filter-group search" style={{ flex: '1', minWidth: '100px' }}>
          <label className="filter-label">
            유저코드
            <span style={{ fontSize: '10px', fontWeight: '500', color: userCode.length === USER_CODE_LENGTH ? 'var(--accent-indigo)' : 'var(--text-muted)', marginLeft: '4px' }}>
              ({userCode.length}/{USER_CODE_LENGTH})
            </span>
          </label>
          <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
            {!userCodeMissing && (
              <div className="search-input-wrapper" style={{ height: '30px', position: 'relative', width: '100%' }}>
                <Search className="search-icon" style={{ left: '6px', width: '11px', height: '11px' }} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="검색..."
                  value={userCode}
                  onChange={(e) => {
                    setUserCode(normalizeUserCode(e.target.value));
                    setUserCodeMissing(false);
                  }}
                  onKeyDown={handleKeyDown}
                  style={{ padding: '6px 10px 6px 20px', fontSize: '12px', height: '30px', width: '100%', letterSpacing: '0.2px' }}
                />
              </div>
            )}
            {(userCodeMissing || userCode.trim() === '') && (
              <button
                type="button"
                aria-pressed={userCodeMissing}
                onClick={() => {
                  const next = !userCodeMissing;
                  setUserCodeMissing(next);
                  if (next) setUserCode('');
                }}
                style={{
                  height: '30px',
                  minWidth: userCodeMissing ? '100%' : '46px',
                  padding: '0 8px',
                  borderRadius: '8px',
                  border: userCodeMissing ? '1px solid rgba(79, 70, 229, 0.55)' : '1px solid var(--border-light)',
                  background: userCodeMissing ? 'rgba(79, 70, 229, 0.1)' : '#ffffff',
                  color: userCodeMissing ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                없음
              </button>
            )}
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
