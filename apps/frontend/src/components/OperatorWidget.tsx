import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BookOpen,
  Database,
  ExternalLink,
  FileText,
  Info,
  LogOut,
  Shield,
  User,
  X,
} from 'lucide-react';
import { inquiryApi } from '../api/inquiryApi';
import type { OperatorInfo } from '../api/inquiryApi';

interface OperatorWidgetProps {
  operator: OperatorInfo | null;
  collapsed: boolean;
  onManageAccounts: () => void;
  onSwitchAccount: () => void;
}

interface AdminTool {
  label: string;
  path: string;
  icon: LucideIcon;
  borderColor: string;
  background: string;
  color: string;
}

const ADMIN_TOOLS: AdminTool[] = [
  {
    label: '워크플로우 관리 (n8n)',
    path: '/n8n/',
    icon: ExternalLink,
    borderColor: 'rgba(129, 140, 248, 0.28)',
    background: 'rgba(129, 140, 248, 0.12)',
    color: '#c7d2fe',
  },
  {
    label: 'API 문서 (Swagger)',
    path: '/docs',
    icon: FileText,
    borderColor: 'rgba(34, 197, 94, 0.28)',
    background: 'rgba(34, 197, 94, 0.12)',
    color: '#bbf7d0',
  },
  {
    label: '개발팀 위키 (Docusaurus)',
    path: '/wiki/',
    icon: BookOpen,
    borderColor: 'rgba(6, 182, 212, 0.28)',
    background: 'rgba(6, 182, 212, 0.12)',
    color: '#cffafe',
  },
  {
    label: '파일 관리 (minio)',
    path: '/minio/',
    icon: Database,
    borderColor: 'rgba(249, 115, 22, 0.28)',
    background: 'rgba(249, 115, 22, 0.12)',
    color: '#fed7aa',
  },
  {
    label: '로그 모니터링 (Grafana)',
    path: '/grafana/',
    icon: Activity,
    borderColor: 'rgba(168, 85, 247, 0.28)',
    background: 'rgba(168, 85, 247, 0.12)',
    color: '#e9d5ff',
  },
];

export function OperatorWidget({
  operator,
  collapsed,
  onManageAccounts,
  onSwitchAccount,
}: OperatorWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  const operatorName = operator?.nickname || '계정 확인 중';
  const operatorId = operator?.id || 'loading';
  const operatorEmail = operator?.email || '';
  const operatorRole = operator?.role || 'UNKNOWN';
  const isAdmin = operatorRole === 'ADMIN';
  const isFallbackOperator = operator?.id === 'unknown';
  const title = operator
    ? `현재 로그인: ${operatorName} (${operatorId})`
    : '현재 로그인 계정 확인 중';
  const roleLabel = operatorRole === 'ADMIN'
    ? '관리자'
    : operatorRole === 'OPERATOR' ? '운영자' : '권한 확인 중';

  const openAdminTool = async (tool: AdminTool) => {
    try {
      await inquiryApi.issueAdminAccess();
      setIsOpen(false);
      window.open(tool.path, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(`Failed to open ${tool.path}:`, error);
      alert(`${tool.label} 접근 권한을 확인하지 못했습니다. 관리자 계정으로 다시 로그인한 뒤 시도해주세요.`);
    }
  };

  const menuBackground = '#111827';
  const menuBorder = 'rgba(255, 255, 255, 0.12)';
  const menuPrimaryText = '#ffffff';
  const menuSecondaryText = '#cbd5e1';

  const menu = (
    <div
      style={{
        position: 'absolute',
        left: collapsed ? 'calc(100% + 12px)' : 0,
        right: collapsed ? 'auto' : 0,
        top: collapsed ? '-6px' : 'calc(100% + 8px)',
        zIndex: 80,
        width: collapsed ? '260px' : '100%',
        padding: '16px',
        borderRadius: '8px',
        border: `1px solid ${menuBorder}`,
        background: menuBackground,
        boxShadow: '0 18px 38px rgba(2, 6, 23, 0.38)',
      }}
    >
      {collapsed && (
        <div
          style={{
            position: 'absolute',
            left: '-8px',
            top: '17px',
            transform: 'rotate(45deg)',
            width: '16px',
            height: '16px',
            background: menuBackground,
            borderLeft: `1px solid ${menuBorder}`,
            borderBottom: `1px solid ${menuBorder}`,
            borderBottomLeftRadius: '3px',
          }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', color: menuPrimaryText, fontWeight: 800, fontSize: '12.5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={14} />
          계정 정보
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="계정 메뉴 닫기"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', padding: 0, borderRadius: '5px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.06)', color: menuSecondaryText, cursor: 'pointer' }}
        >
          <X size={13} />
        </button>
      </div>
      <div style={{ display: 'grid', gap: '6px', marginBottom: '12px', fontSize: '12px', color: menuSecondaryText }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <span>아이디</span>
          <strong style={{ color: menuPrimaryText, overflow: 'hidden', textOverflow: 'ellipsis' }}>{operatorId}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <span>권한</span>
          <strong style={{ color: isAdmin ? '#f87171' : '#818cf8' }}>{roleLabel} ({operatorRole})</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <span>이메일</span>
          <strong style={{ color: menuPrimaryText, overflow: 'hidden', textOverflow: 'ellipsis' }}>{operatorEmail || '-'}</strong>
        </div>
        {isFallbackOperator && (
          <div style={{ marginTop: '4px', color: '#d97706', fontWeight: 700 }}>
            인증 헤더 또는 DB 계정 정보를 확인하지 못했습니다.
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onManageAccounts();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(248, 113, 113, 0.26)', background: 'rgba(248, 113, 113, 0.12)', color: '#fecaca', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
            >
              <Shield size={14} />
              계정 관리
            </button>
            {ADMIN_TOOLS.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <button
                  key={tool.path}
                  type="button"
                  onClick={() => openAdminTool(tool)}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${tool.borderColor}`, background: tool.background, color: tool.color, cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                >
                  <ToolIcon size={14} />
                  {tool.label}
                </button>
              );
            })}
          </>
        )}
        <button
          type="button"
          onClick={onSwitchAccount}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.14)', background: 'rgba(255, 255, 255, 0.08)', color: '#e5e7eb', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
        >
          <LogOut size={14} />
          로그아웃 / 계정 전환
        </button>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <div ref={rootRef} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={`${isOpen ? '' : 'collapsed-tooltip'} operator-compact ${isFallbackOperator ? 'unknown' : ''}`}
          data-tooltip={`${title} - 계정 메뉴`}
          aria-label={title}
          style={{ cursor: 'pointer' }}
        >
          <User size={17} />
        </button>
        {isOpen && menu}
      </div>
    );
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className={`operator-widget ${isFallbackOperator ? 'unknown' : ''}`}
        title={title}
        onClick={() => setIsOpen((open) => !open)}
        style={{
          border: '1px solid rgba(79, 70, 229, 0.16)',
          borderRadius: '8px',
          background: isOpen ? 'rgba(79, 70, 229, 0.08)' : 'rgba(79, 70, 229, 0.04)',
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          transition: 'all 0.2s',
        }}
      >
        <div className="operator-avatar">
          <User size={16} />
        </div>
        <div className="operator-info">
          <span className="operator-label">현재 로그인</span>
          <strong className="operator-name">{operatorName}</strong>
          <span className="operator-meta">{operatorEmail || operatorId}</span>
        </div>
        <span
          style={{
            marginLeft: 'auto',
            flexShrink: 0,
            padding: '3px 7px',
            borderRadius: '999px',
            border: isAdmin ? '1px solid rgba(239, 68, 68, 0.24)' : '1px solid rgba(79, 70, 229, 0.2)',
            background: isAdmin ? 'rgba(239, 68, 68, 0.07)' : 'rgba(79, 70, 229, 0.07)',
            color: isAdmin ? '#dc2626' : 'var(--accent-indigo)',
            fontSize: '10.5px',
            fontWeight: 800,
          }}
        >
          {operatorRole}
        </span>
      </button>
      {isOpen && menu}
    </div>
  );
}
