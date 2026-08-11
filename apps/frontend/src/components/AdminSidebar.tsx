import { useEffect, useMemo, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Plus, User } from 'lucide-react';
import type { OperatorInfo } from '../types/inquiry';
import type { CustomFilterEntity } from '../types/inquiry';
import type { FilterValues } from './FilterBar';
import { OperatorWidget } from './OperatorWidget';
import { NaverSessionWidget } from './NaverSessionWidget';
import type { NaverSessionStatus } from './NaverSessionWidget';
import {
  BookmarkedStatsCard,
  MissingUserCodeStatsCard,
  TodayStatsCard,
  UnprocessedStatsCard,
} from './StatsCards';

const EXPANDED_WIDTH = 300;
const COLLAPSED_WIDTH = 64;

type SidebarItem =
  | 'PROFILE'
  | 'SESSION'
  | 'STATS_UNPROCESSED'
  | 'STATS_TODAY'
  | 'USER_CODE_MISSING'
  | 'BOOKMARKS'
  | 'CUSTOM_FILTERS';

interface WidgetGroup {
  id: 'account_session_group' | 'filter_group';
  name: string;
  items: SidebarItem[];
}

interface AdminSidebarProps {
  operator: OperatorInfo | null;
  naverSessionStatus: NaverSessionStatus;
  naverSessionUpdatedAt: string | null;
  customFilters: CustomFilterEntity[];
  stats: {
    unprocessedCount: number;
    unprocessedHasMore: boolean;
    todayCount: number;
    todayHasMore: boolean;
    missingUserCodeCount: number;
    missingUserCodeHasMore: boolean;
    bookmarkedCount: number;
  };
  onValidateNaverSession: () => void;
  onRenewNaverSession: () => void;
  onManageAccounts: () => void;
  onSwitchAccount: () => void;
  onApplyFilter: (filter: FilterValues) => void;
  onShowUnprocessed: () => void;
  onShowToday: () => void;
  onShowMissingUserCode: () => void;
  onShowBookmarks: () => void;
  onCreateTicket: () => void;
}

const DEFAULT_GROUPS: WidgetGroup[] = [
  { id: 'account_session_group', name: '계정 및 연동 정보', items: ['PROFILE', 'SESSION'] },
  { id: 'filter_group', name: '필터 목록', items: ['STATS_UNPROCESSED', 'STATS_TODAY', 'USER_CODE_MISSING', 'BOOKMARKS', 'CUSTOM_FILTERS'] },
];

const restoreGroups = (): WidgetGroup[] => {
  const saved = localStorage.getItem('admin_cs_sidebar_groups_v3');
  if (!saved) return DEFAULT_GROUPS;
  try {
    return (JSON.parse(saved) as WidgetGroup[]).map((group) => {
      if (group.id !== 'filter_group' || group.items.includes('USER_CODE_MISSING')) return group;
      const items = [...group.items];
      const bookmarkIndex = items.indexOf('BOOKMARKS');
      items.splice(bookmarkIndex === -1 ? items.length : bookmarkIndex, 0, 'USER_CODE_MISSING');
      return { ...group, items };
    });
  } catch {
    return DEFAULT_GROUPS;
  }
};

const restoreFilterOrder = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem('admin_cs_custom_filter_order_v1') || '[]') as number[];
  } catch {
    return [];
  }
};

const toFilterValues = (filter: CustomFilterEntity): FilterValues => {
  const data = filter.filterData || {};
  return {
    userCode: data.userCode || '',
    userCodeMissing: Boolean(data.userCodeMissing),
    statuses: data.statuses || [],
    channels: data.channels || [],
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    isManual: data.isManual,
    bookmarkedOnly: Boolean(data.bookmarkedOnly),
  };
};

const summarizeFilter = (filter: CustomFilterEntity) => {
  const values = toFilterValues(filter);
  const parts: string[] = [];
  if (values.statuses.length) parts.push(values.statuses.join(', '));
  if (values.channels.length) parts.push(values.channels.join(', '));
  if (values.userCode) parts.push(values.userCode);
  if (values.userCodeMissing) parts.push('유저코드 없음');
  if (values.bookmarkedOnly) parts.push('즐겨찾기');
  if (values.isManual !== undefined) parts.push(values.isManual ? '수동' : '자동');
  if (values.startDate || values.endDate) parts.push(`${values.startDate || '전체'}~${values.endDate || '전체'}`);
  return parts.length ? parts.join(' · ') : '전체 조건';
};

export function AdminSidebar(props: AdminSidebarProps) {
  const [width, setWidth] = useState(280);
  const [collapsed, setCollapsed] = useState(true);
  const [resizing, setResizing] = useState(false);
  const [groups, setGroups] = useState<WidgetGroup[]>(restoreGroups);
  const [draggedGroup, setDraggedGroup] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ groupId: string; index: number } | null>(null);
  const [filterOrder, setFilterOrder] = useState<number[]>(restoreFilterOrder);
  const [draggedFilterId, setDraggedFilterId] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('admin_cs_sidebar_groups_v3', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('admin_cs_custom_filter_order_v1', JSON.stringify(filterOrder));
  }, [filterOrder]);

  const orderedFilters = useMemo(() => {
    const availableIds = new Set(props.customFilters.map((filter) => filter.id));
    const retainedOrder = filterOrder.filter((id) => availableIds.has(id));
    const missingIds = props.customFilters
      .map((filter) => filter.id)
      .filter((id) => !retainedOrder.includes(id));
    const positions = new Map([...retainedOrder, ...missingIds].map((id, index) => [id, index]));
    return [...props.customFilters].sort((left, right) => (
      (positions.get(left.id) ?? Number.MAX_SAFE_INTEGER)
      - (positions.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    ));
  }, [filterOrder, props.customFilters]);

  const startResizing = (event: React.MouseEvent) => {
    event.preventDefault();
    setResizing(true);
    const startX = event.clientX;
    const startWidth = width;
    const onMove = (moveEvent: MouseEvent) => setWidth(Math.max(200, Math.min(EXPANDED_WIDTH, startWidth + moveEvent.clientX - startX)));
    const onUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const moveGroup = (targetIndex: number) => {
    if (draggedGroup === null || draggedGroup === targetIndex) return;
    setGroups((current) => {
      const next = [...current];
      const [moved] = next.splice(draggedGroup, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedGroup(targetIndex);
  };

  const moveItem = (groupId: string, targetIndex: number) => {
    if (!draggedItem || draggedItem.groupId !== groupId || draggedItem.index === targetIndex) return;
    setGroups((current) => current.map((group) => {
      if (group.id !== groupId) return group;
      const items = [...group.items];
      const [moved] = items.splice(draggedItem.index, 1);
      items.splice(targetIndex, 0, moved);
      return { ...group, items };
    }));
    setDraggedItem({ groupId, index: targetIndex });
  };

  const moveFilter = (targetId: number) => {
    if (draggedFilterId === null || draggedFilterId === targetId) return;
    setFilterOrder((current) => {
      const next = current.length ? [...current] : orderedFilters.map((filter) => filter.id);
      orderedFilters.forEach((filter) => { if (!next.includes(filter.id)) next.push(filter.id); });
      const from = next.indexOf(draggedFilterId);
      const to = next.indexOf(targetId);
      if (from === -1 || to === -1) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const filterShortcut = (filter: CustomFilterEntity, compact: boolean) => {
    const summary = summarizeFilter(filter);
    return (
      <button
        type="button"
        className={compact ? 'collapsed-tooltip custom-filter-compact' : 'custom-filter-shortcut'}
        data-tooltip={compact ? `${filter.name} - ${summary}` : undefined}
        aria-label={`${filter.name} 필터 적용`}
        title={compact ? undefined : summary}
        onClick={() => props.onApplyFilter(toFilterValues(filter))}
        style={compact ? undefined : { width: '100%' }}
      >
        {compact ? <Bookmark size={16} /> : (
          <>
            <div className="custom-filter-shortcut-icon"><Bookmark size={20} /></div>
            <div className="custom-filter-shortcut-info">
              <span className="custom-filter-shortcut-name">{filter.name}</span>
              <span className="custom-filter-shortcut-summary">{summary}</span>
            </div>
            <div className="custom-filter-shortcut-badge">저장됨</div>
          </>
        )}
      </button>
    );
  };

  const renderItem = (item: SidebarItem, compact: boolean) => {
    switch (item) {
      case 'PROFILE':
        return <OperatorWidget operator={props.operator} collapsed={compact} onManageAccounts={props.onManageAccounts} onSwitchAccount={props.onSwitchAccount} />;
      case 'SESSION':
        return <NaverSessionWidget status={props.naverSessionStatus} updatedAt={props.naverSessionUpdatedAt} collapsed={compact} onValidate={props.onValidateNaverSession} onRenew={props.onRenewNaverSession} />;
      case 'STATS_UNPROCESSED':
        return <UnprocessedStatsCard count={props.stats.unprocessedCount} hasMore={props.stats.unprocessedHasMore} isCollapsed={compact} onClick={props.onShowUnprocessed} />;
      case 'STATS_TODAY':
        return <TodayStatsCard count={props.stats.todayCount} hasMore={props.stats.todayHasMore} isCollapsed={compact} onClick={props.onShowToday} />;
      case 'USER_CODE_MISSING':
        return <MissingUserCodeStatsCard count={props.stats.missingUserCodeCount} hasMore={props.stats.missingUserCodeHasMore} isCollapsed={compact} onClick={props.onShowMissingUserCode} />;
      case 'BOOKMARKS':
        return <BookmarkedStatsCard count={props.stats.bookmarkedCount} isCollapsed={compact} onClick={props.onShowBookmarks} />;
      case 'CUSTOM_FILTERS':
        if (compact) {
          return orderedFilters.map((filter) => <div key={filter.id} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '2px 0' }}>{filterShortcut(filter, true)}</div>);
        }
        return (
          <div className="custom-filter-shortcut-list" style={{ marginTop: '2px' }}>
            {orderedFilters.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '10px 12px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>저장된 필터가 없습니다.</div>
            ) : orderedFilters.map((filter) => (
              <div
                key={filter.id}
                draggable
                onDragStart={(event) => { event.stopPropagation(); setDraggedFilterId(filter.id); }}
                onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); moveFilter(filter.id); }}
                onDragEnd={() => setDraggedFilterId(null)}
                style={{ width: '100%', opacity: draggedFilterId === filter.id ? 0.45 : 1, cursor: 'grab' }}
              >
                {filterShortcut(filter, false)}
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <>
      <aside
        className="dashboard-sidebar"
        style={{
          width: collapsed ? `${COLLAPSED_WIDTH}px` : `${width}px`,
          minWidth: collapsed ? `${COLLAPSED_WIDTH}px` : undefined,
          maxWidth: collapsed ? `${COLLAPSED_WIDTH}px` : `${EXPANDED_WIDTH}px`,
          padding: collapsed ? '20px 0' : undefined,
          alignItems: collapsed ? 'center' : undefined,
          overflowX: collapsed ? 'visible' : 'hidden',
          overflowY: collapsed ? 'visible' : 'auto',
          transition: resizing ? 'none' : 'width 0.2s ease',
          gap: collapsed ? '8px' : undefined,
        }}
      >
        {collapsed ? (
          <>
            <button type="button" onClick={() => setCollapsed(false)} className="collapsed-tooltip" data-tooltip="사이드바 펼치기" aria-label="사이드바 펼치기" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', width: '40px', justifyContent: 'center' }}>
              <ChevronRight size={18} />
            </button>
            {groups.map((group, groupIndex) => (
              <div key={group.id} style={{ display: 'contents' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
                  {group.items.map((item) => <div key={item} style={{ width: '100%' }}>{renderItem(item, true)}</div>)}
                </div>
                {groupIndex === 0 && <div style={{ height: '1px', background: 'var(--border-light)', margin: '8px 0', width: '24px' }} />}
              </div>
            ))}
            <button type="button" className="btn-primary glow-violet-hover collapsed-tooltip" onClick={props.onCreateTicket} data-tooltip="CS 티켓 수동 생성" aria-label="CS 티켓 수동 생성" style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center', borderRadius: '50%', marginTop: 'auto', marginBottom: '8px' }}>
              <Plus size={18} />
            </button>
          </>
        ) : (
          <>
            <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
              <div><h1 className="gradient-text">Admin CS</h1><p className="sidebar-subtitle">고객 문의를 통합 관리합니다.</p></div>
              <button type="button" onClick={() => setCollapsed(true)} title="사이드바 접기" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {groups.map((group, groupIndex) => (
                <div
                  key={group.id}
                  draggable
                  onDragStart={() => { setDraggedGroup(groupIndex); setDraggedItem(null); }}
                  onDragOver={(event) => { event.preventDefault(); moveGroup(groupIndex); }}
                  onDragEnd={() => setDraggedGroup(null)}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', opacity: draggedGroup === groupIndex ? 0.4 : 1, padding: '4px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', cursor: 'grab' }}>
                    {group.id === 'account_session_group' ? <User size={11} /> : <Bookmark size={11} />}{group.name}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {group.items.map((item, itemIndex) => (
                      <div
                        key={item}
                        draggable={item !== 'CUSTOM_FILTERS'}
                        onDragStart={(event) => { event.stopPropagation(); if (item !== 'CUSTOM_FILTERS') setDraggedItem({ groupId: group.id, index: itemIndex }); }}
                        onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); if (item !== 'CUSTOM_FILTERS') moveItem(group.id, itemIndex); }}
                        onDragEnd={() => setDraggedItem(null)}
                        style={{ width: '100%', opacity: draggedItem?.groupId === group.id && draggedItem.index === itemIndex ? 0.4 : 1, cursor: item === 'CUSTOM_FILTERS' ? 'default' : 'grab' }}
                      >
                        {renderItem(item, false)}
                      </div>
                    ))}
                  </div>
                  {groupIndex === 0 && <div style={{ height: '1px', background: 'var(--border-light)', margin: '12px 0 4px', width: '100%' }} />}
                </div>
              ))}
            </div>
            <button type="button" className="btn-primary glow-violet-hover" onClick={props.onCreateTicket} style={{ width: '100%', justifyContent: 'center' }}><Plus size={16} />CS 티켓 수동 생성</button>
          </>
        )}
      </aside>
      <div className={`resize-divider ${resizing ? 'active' : ''}`} onMouseDown={collapsed ? undefined : startResizing} style={{ display: collapsed ? 'none' : undefined }} />
    </>
  );
}
