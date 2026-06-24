import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: { channel: string; userCode: string; content: string }) => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [channel, setChannel] = useState('MANUAL');
  const [userCode, setUserCode] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('문의 내용을 입력해 주세요.');
      return;
    }

    if (userCode && !/^[0-9]{12}$/.test(userCode.trim())) {
      setError('유저 코드는 숫자 12자리여야 합니다 (비워두거나 12자리 숫자 입력).');
      return;
    }

    onSubmit({
      channel,
      userCode: userCode.trim() || '',
      content: content.trim(),
    });

    // Reset form
    setUserCode('');
    setContent('');
    setChannel('MANUAL');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ border: '1px solid rgba(255, 255, 255, 0.15)' }}
      >
        <div className="modal-header">
          <h2 className="modal-title gradient-text">CS 티켓 수동 생성</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div 
              style={{ 
                padding: '10px 12px', 
                background: 'rgba(239, 68, 68, 0.15)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                borderRadius: '8px', 
                color: '#f87171',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Channel field */}
          <div className="form-group">
            <label htmlFor="modal-channel">접수 채널</label>
            <select
              id="modal-channel"
              className="form-input"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="MANUAL">MANUAL (수동 입력)</option>
              <option value="KAKAO">KAKAO (카카오톡)</option>
              <option value="NAVER_CAFE">NAVER_CAFE (네이버 카페)</option>
            </select>
          </div>

          {/* User Code field */}
          <div className="form-group">
            <label htmlFor="modal-usercode">유저 코드 (선택)</label>
            <input
              id="modal-usercode"
              type="text"
              className="form-input"
              placeholder="숫자 12자리 입력 (예: 123456789012)"
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              maxLength={12}
            />
          </div>

          {/* Content field */}
          <div className="form-group">
            <label htmlFor="modal-content">문의 내용</label>
            <textarea
              id="modal-content"
              className="form-textarea"
              placeholder="상세 문의 내용을 작성해 주세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              <Send size={14} />
              생성하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
