import React, { useState } from 'react';
import { Lock, Smartphone, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { inquiryApi } from '../api/inquiryApi';

export const NaverLoginRenewPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Extract token from query params
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token') || '';
  const isTokenMissing = !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (isTokenMissing) {
      setError('유효한 세션 갱신 토큰이 없습니다. 슬랙 알림의 링크를 통해 다시 접속해 주세요.');
      return;
    }

    const cleanCode = code.trim().replace(/\s/g, '');
    if (cleanCode.length !== 8 || isNaN(Number(cleanCode))) {
      setError('올바른 8자리 일회용 로그인 번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      await inquiryApi.renewNaverSession(cleanCode, token);
      setSuccess(true);
      setCode('');
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 
        '세션 갱신에 실패했습니다. 번호가 만료되었거나 워커 서버에 문제가 있을 수 있습니다. 다시 확인해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '20px'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(30, 41, 59, 0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '20px',
              marginBottom: '20px',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)'
            }}
          >
            <Lock size={32} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', background: 'linear-gradient(to right, #10b981, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            네이버 카페 세션 갱신
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
            비공개 카페 크롤링 및 자동화를 위한 세션을 안전하게 업데이트합니다.
          </p>
        </div>

        {isTokenMissing && (
          <div 
            style={{ 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'flex-start',
              padding: '12px 16px', 
              background: 'rgba(239, 68, 68, 0.15)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              borderRadius: '12px', 
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '24px',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>보안 경고:</strong> 유효한 세션 갱신 토큰이 없습니다. 이 페이지에 직접 접속하여 세션을 임의로 갱신할 수 없으며, 슬랙 알림의 링크를 통해 토큰을 포함한 주소로 접속해야 합니다.
            </span>
          </div>
        )}

        {/* Guide Steps */}
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '28px',
            border: '1px solid rgba(255, 255, 255, 0.03)'
          }}
        >
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: '#10b981' }}>
            <Smartphone size={16} /> 일회용 번호 발급 안내 (모바일 앱)
          </h4>
          <ol style={{ fontSize: '13px', color: '#cbd5e1', paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
            <li style={{ marginBottom: '6px' }}>스마트폰에서 <strong>네이버 앱</strong>을 실행합니다.</li>
            <li style={{ marginBottom: '6px' }}>좌측 상단 <strong>메뉴(≡)</strong> ➡️ 우측 상단 <strong>설정(톱니바퀴)</strong> 터치</li>
            <li style={{ marginBottom: '6px' }}><strong>로그인 아이디 관리</strong> 터치</li>
            <li>원하는 아이디 우측의 <strong>더보기(세로 점 3개)</strong> 터치 ➡️ <strong>일회용 로그인 번호</strong> 확인</li>
          </ol>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label 
              htmlFor="one-time-code"
              style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '8px' }}
            >
              8자리 일회용 번호 입력
            </label>
            <input 
              id="one-time-code"
              type="text" 
              inputMode="numeric"
              maxLength={8}
              placeholder={isTokenMissing ? "접근이 제한됨" : "12345678"}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={loading || isTokenMissing}
              style={{
                width: '100%',
                background: isTokenMissing ? 'rgba(15, 23, 42, 0.3)' : 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '18px',
                fontWeight: 600,
                textAlign: 'center',
                letterSpacing: '4px',
                color: isTokenMissing ? '#64748b' : '#ffffff',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                if (!isTokenMissing) e.target.style.borderColor = '#10b981';
              }}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          {error && (
            <div 
              style={{ 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'flex-start',
                padding: '12px 16px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                borderRadius: '12px', 
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '24px',
                lineHeight: 1.4
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div 
              style={{ 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center',
                padding: '12px 16px', 
                background: 'rgba(16, 185, 129, 0.1)', 
                border: '1px solid rgba(16, 185, 129, 0.2)', 
                borderRadius: '12px', 
                color: '#34d399',
                fontSize: '13px',
                marginBottom: '24px'
              }}
            >
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>네이버 세션 쿠키가 성공적으로 갱신되었습니다!</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || code.length !== 8 || isTokenMissing}
            style={{
              width: '100%',
              background: loading || code.length !== 8 || isTokenMissing
                ? 'rgba(16, 185, 129, 0.15)' 
                : 'linear-gradient(to right, #10b981, #059669)',
              color: loading || code.length !== 8 || isTokenMissing ? '#64748b' : '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading || code.length !== 8 || isTokenMissing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: code.length === 8 && !loading && !isTokenMissing ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none',
              transition: 'transform 0.1s, opacity 0.2s'
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Playwright 로그인 시도 중... (최대 10초)</span>
              </>
            ) : (
              <span>세션 갱신하기</span>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
