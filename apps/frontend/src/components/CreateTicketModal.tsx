import React, { useState, useRef } from 'react';
import { X, Send, Mail, FileText, Phone, Plus, Trash2, ImagePlus, Loader2 } from 'lucide-react';
import { inquiryApi } from '../api/inquiryApi';
import type { CreateInquiryInput } from '../api/inquiryApi';
import type { ChannelMetadata } from '../types/inquiry';

export type CreateTicketInput = Omit<CreateInquiryInput, 'userCode'> & { userCode: string };

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: CreateTicketInput) => void;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl: string | null; // null = not yet uploaded
  status: 'pending' | 'uploading' | 'done' | 'error';
}

const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_COMPRESSION_QUALITY = 0.78;

const replaceFileExtension = (fileName: string, extension: string) => {
  const safeName = fileName.replace(/\s+/g, '_');
  const dotIndex = safeName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
  return `${baseName}.${extension}`;
};

const loadImage = (file: File): Promise<HTMLImageElement> => (
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`이미지 파일을 읽을 수 없습니다: ${file.name}`));
    };
    img.src = objectUrl;
  })
);

const compressImageFile = async (file: File): Promise<File> => {
  if (file.type === 'image/gif') {
    return file;
  }

  const image = await loadImage(file);
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', IMAGE_COMPRESSION_QUALITY);
  });

  if (!blob || blob.size >= file.size) {
    return file;
  }

  return new File([blob], replaceFileExtension(file.name, 'jpg'), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
};

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [activeTab, setActiveTab] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [userCode, setUserCode] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email specific fields
  const [emailFrom, setEmailFrom] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailDate, setEmailDate] = useState('');

  // Phone specific fields
  const [phoneNum, setPhoneNum] = useState('');
  const [phoneMemo, setPhoneMemo] = useState('');
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Image state
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setUserCode('');
    setContent('');
    setError('');
    setFocusedField(null);
    setActiveTab('EMAIL');
    setIsSubmitting(false);

    setEmailFrom('');
    setEmailTo('');
    setEmailSubject('');
    setEmailDate('');

    setPhoneNum('');
    setPhoneMemo('');
    setCustomFields([]);
    setNewKey('');
    setNewValue('');

    // revoke object URLs
    pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setPendingImages([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddCustomField = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) {
      setError('속성명과 속성값을 모두 입력해 주세요.');
      return;
    }
    if (customFields.some(f => f.key.toLowerCase() === newKey.trim().toLowerCase())) {
      setError('이미 존재하는 속성명입니다.');
      return;
    }
    setCustomFields([...customFields, { key: newKey.trim(), value: newValue.trim() }]);
    setNewKey('');
    setNewValue('');
    setError('');
  };

  const handleRemoveCustomField = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  // ── Image handling ─────────────────────────────────────────────────────────

  const addFiles = (files: FileList | File[]) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const arr = Array.from(files);

    if (pendingImages.length + arr.length > 10) {
      setError('이미지는 최대 10개까지 첨부할 수 있습니다.');
      return;
    }

    const valid = arr.filter(f => {
      if (!allowed.includes(f.type)) { setError(`지원하지 않는 파일 형식입니다: ${f.name}`); return false; }
      if (f.size > maxSize) { setError(`파일 크기가 10MB를 초과합니다: ${f.name}`); return false; }
      return true;
    });

    if (valid.length === 0) return;

    const newPending: PendingImage[] = valid.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: null,
      status: 'pending' as const,
    }));

    setPendingImages(prev => [...prev, ...newPending]);
    setError('');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    setPendingImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  /** Upload all pending images to MinIO, return their download URLs */
  const uploadImages = async (): Promise<string[]> => {
    if (pendingImages.length === 0) return [];

    const timestamp = Date.now();
    const compressedImages = await Promise.all(
      pendingImages.map(async (img) => ({
        ...img,
        uploadFile: await compressImageFile(img.file),
      }))
    );

    const fileRequests = compressedImages.map((img, idx) => ({
      objectName: `inquiries/manual/${timestamp}_${idx}_${img.uploadFile.name.replace(/\s+/g, '_')}`,
      contentType: img.uploadFile.type || 'image/jpeg',
    }));

    // Get presigned URLs
    const presignedList = await inquiryApi.getPresignedUrls(fileRequests);

    const downloadUrls: string[] = [];

    // Upload each file
    for (let i = 0; i < compressedImages.length; i++) {
      const img = compressedImages[i];
      const { uploadUrl, downloadUrl } = presignedList[i];

      setPendingImages(prev => prev.map(p => p.id === img.id ? { ...p, status: 'uploading' } : p));
      try {
        await inquiryApi.uploadToMinIO(uploadUrl, img.uploadFile);
        downloadUrls.push(downloadUrl);
        setPendingImages(prev => prev.map(p => p.id === img.id ? { ...p, status: 'done', uploadedUrl: downloadUrl } : p));
      } catch (cause) {
        setPendingImages(prev => prev.map(p => p.id === img.id ? { ...p, status: 'error' } : p));
        throw new Error(`이미지 업로드 실패: ${img.file.name}`, { cause });
      }
    }

    return downloadUrls;
  };

  // ── Form validation & submit ───────────────────────────────────────────────

  const getInputStyle = (fieldId: string) => {
    const isFocused = focusedField === fieldId;
    return {
      height: '36px',
      padding: '6px 12px',
      borderRadius: '8px',
      border: isFocused ? '1px solid var(--accent-indigo)' : '1px solid #cbd5e1',
      background: '#ffffff',
      color: '#0f172a',
      fontSize: '13px',
      outline: 'none',
      width: '100%',
      boxShadow: isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.12)' : 'none',
      transition: 'all 0.15s ease',
    };
  };

  const getTextareaStyle = (fieldId: string) => {
    const isFocused = focusedField === fieldId;
    return {
      height: '100%',
      minHeight: '200px',
      padding: '10px 12px',
      borderRadius: '8px',
      border: isFocused ? '1px solid var(--accent-indigo)' : '1px solid #cbd5e1',
      background: '#ffffff',
      color: '#0f172a',
      fontSize: '13px',
      outline: 'none',
      width: '100%',
      resize: 'none' as const,
      boxShadow: isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.12)' : 'none',
      transition: 'all 0.15s ease',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) { setError('문의 내용을 입력해 주세요.'); return; }
    if (userCode && !/^[0-9]{12}$/.test(userCode.trim())) { setError('유저 코드는 숫자 12자리여야 합니다.'); return; }

    let channelMetadata: ChannelMetadata;

    if (activeTab === 'EMAIL') {
      if (!emailFrom.trim()) { setError('보낸 사람 이메일은 필수입니다.'); return; }
      if (!validateEmail(emailFrom.trim())) { setError('보낸 사람 이메일 형식이 유효하지 않습니다.'); return; }
      if (emailTo.trim() && !validateEmail(emailTo.trim())) { setError('받는 사람 이메일 형식이 유효하지 않습니다.'); return; }
      if (!emailSubject.trim()) { setError('이메일 제목은 필수입니다.'); return; }

      channelMetadata = {
        metadataType: 'EMAIL',
        from: emailFrom.trim(),
        to: emailTo.trim() || undefined,
        subject: emailSubject.trim(),
        date: emailDate.trim() ? new Date(emailDate).toISOString() : new Date().toISOString(),
      };
    } else {
      if (!phoneNum.trim()) { setError('전화번호 입력은 필수입니다.'); return; }

      const customFieldsObj: Record<string, string> = {};
      customFields.forEach(f => { customFieldsObj[f.key] = f.value; });

      channelMetadata = {
        metadataType: 'PHONE',
        phoneNumber: phoneNum.trim(),
        memo: phoneMemo.trim() || undefined,
        customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : undefined,
      };
    }

    setIsSubmitting(true);
    try {
      const imageUrls = await uploadImages();
      onSubmit({
        channel: activeTab,
        userCode: userCode.trim() || '',
        content: content.trim(),
        channelMetadata,
        imageUrls,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          border: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '840px',
          maxWidth: '840px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          borderRadius: '20px',
          gap: 0,
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} style={{ color: 'var(--accent-indigo)' }} />
            <h2 className="modal-title gradient-text" style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-display)', margin: 0 }}>
              CS 티켓 수동 생성
            </h2>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={handleClose}
            style={{
              padding: '6px', borderRadius: '50%', background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
            }}
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', padding: '4px 28px 0 28px', gap: '16px' }}>
          {(['EMAIL', 'PHONE'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setError(''); }}
              style={{
                padding: '12px 16px', fontSize: '13px',
                fontWeight: activeTab === tab ? '700' : '500',
                color: activeTab === tab ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                border: 'none', background: 'transparent',
                borderBottom: activeTab === tab ? '2px solid var(--accent-indigo)' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
              }}
            >
              {tab === 'EMAIL' ? <Mail size={14} /> : <Phone size={14} />}
              {tab === 'EMAIL' ? '이메일 접수' : '전화 접수'}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '8px', color: '#e11d48', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️</span>{error}
              </div>
            )}

            {/* Split Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'stretch' }}>

              {/* Left Column: Meta Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(79, 70, 229, 0.015)', border: '1px solid rgba(79, 70, 229, 0.06)', borderRadius: '12px', padding: '18px 20px', minHeight: '340px' }}>

                {/* EMAIL FORM */}
                {activeTab === 'EMAIL' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(79, 70, 229, 0.08)', paddingBottom: '8px', marginBottom: '4px' }}>
                      <Mail size={14} style={{ color: 'var(--accent-indigo)' }} />
                      <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--accent-indigo)' }}>접수 메일 정보</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>보낸 사람 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="text" className="form-input" placeholder="sender@example.com" value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} onFocus={() => setFocusedField('emailFrom')} onBlur={() => setFocusedField(null)} style={getInputStyle('emailFrom')} />
                      </div>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>받는 사람</label>
                        <input type="text" className="form-input" placeholder="receiver@example.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} onFocus={() => setFocusedField('emailTo')} onBlur={() => setFocusedField(null)} style={getInputStyle('emailTo')} />
                      </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>이메일 제목 <span style={{ color: '#ef4444' }}>*</span></label>
                      <input type="text" className="form-input" placeholder="접수된 이메일 제목" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} onFocus={() => setFocusedField('emailSubject')} onBlur={() => setFocusedField(null)} style={getInputStyle('emailSubject')} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label htmlFor="modal-usercode-email" style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>유저 코드 (선택)</label>
                        <input id="modal-usercode-email" type="text" className="form-input" placeholder="숫자 12자리" value={userCode} onChange={(e) => { const onlyNums = e.target.value.replace(/[^0-9]/g, ''); setUserCode(onlyNums.slice(0, 12)); }} onFocus={() => setFocusedField('userCode')} onBlur={() => setFocusedField(null)} maxLength={12} style={getInputStyle('userCode')} />
                      </div>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>작성 일시</label>
                        <input type="datetime-local" className="form-input" value={emailDate} onChange={(e) => setEmailDate(e.target.value)} onFocus={() => setFocusedField('emailDate')} onBlur={() => setFocusedField(null)} style={{ ...getInputStyle('emailDate'), padding: '4px 8px' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* PHONE FORM */}
                {activeTab === 'PHONE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(79, 70, 229, 0.08)', paddingBottom: '8px', marginBottom: '4px' }}>
                      <Phone size={14} style={{ color: 'var(--accent-indigo)' }} />
                      <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--accent-indigo)' }}>전화 접수 정보</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>전화번호 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="text" className="form-input" placeholder="010-1234-5678" value={phoneNum} onChange={(e) => setPhoneNum(e.target.value)} onFocus={() => setFocusedField('phoneNum')} onBlur={() => setFocusedField(null)} style={getInputStyle('phoneNum')} />
                      </div>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label htmlFor="modal-usercode-phone" style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>유저 코드 (선택)</label>
                        <input id="modal-usercode-phone" type="text" className="form-input" placeholder="숫자 12자리" value={userCode} onChange={(e) => { const onlyNums = e.target.value.replace(/[^0-9]/g, ''); setUserCode(onlyNums.slice(0, 12)); }} onFocus={() => setFocusedField('userCode')} onBlur={() => setFocusedField(null)} maxLength={12} style={getInputStyle('userCode')} />
                      </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>상담 요약/메모</label>
                      <input type="text" className="form-input" placeholder="예: 고객 불만으로 긴급 이관 요청 등" value={phoneMemo} onChange={(e) => setPhoneMemo(e.target.value)} onFocus={() => setFocusedField('phoneMemo')} onBlur={() => setFocusedField(null)} style={getInputStyle('phoneMemo')} />
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', flex: 1, minHeight: 0 }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>임의 속성 추가 (선택)</label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input type="text" placeholder="속성명" value={newKey} onChange={(e) => setNewKey(e.target.value)} onFocus={() => setFocusedField('newKey')} onBlur={() => setFocusedField(null)} style={{ ...getInputStyle('newKey'), flex: 1.2 }} />
                        <input type="text" placeholder="속성값" value={newValue} onChange={(e) => setNewValue(e.target.value)} onFocus={() => setFocusedField('newValue')} onBlur={() => setFocusedField(null)} style={{ ...getInputStyle('newValue'), flex: 1 }} />
                        <button type="button" onClick={handleAddCustomField} style={{ background: 'var(--accent-indigo)', color: '#ffffff', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 6px rgba(99, 102, 241, 0.2)' }} title="추가">
                          <Plus size={16} />
                        </button>
                      </div>

                      {customFields.length > 0 && (
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', maxHeight: '94px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {customFields.map((field, idx) => (
                            <div key={field.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #f1f5f9', gap: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>{field.key}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <span style={{ fontSize: '11.5px', color: '#0f172a' }}>{field.value}</span>
                                <button type="button" onClick={(e) => handleRemoveCustomField(idx, e)} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'} onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Content + Image Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label htmlFor="modal-content" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    문의 내용 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    id="modal-content"
                    className="form-textarea"
                    placeholder="고객이 보낸 문의 상세 내용을 복사해 붙여넣거나 직접 작성해 주세요..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={() => setFocusedField('content')}
                    onBlur={() => setFocusedField(null)}
                    style={getTextareaStyle('content')}
                  />
                </div>

                {/* Image Upload Area */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    이미지 첨부 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(선택, 최대 10개 · 각 10MB)</span>
                  </label>

                  {/* Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? 'var(--accent-indigo)' : '#cbd5e1'}`,
                      borderRadius: '10px',
                      padding: '12px',
                      background: isDragging ? 'rgba(99, 102, 241, 0.04)' : '#fafafa',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      minHeight: pendingImages.length === 0 ? '72px' : undefined,
                    }}
                  >
                    {pendingImages.length === 0 ? (
                      <>
                        <ImagePlus size={20} style={{ color: '#94a3b8' }} />
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>클릭하거나 이미지를 드래그하여 추가</span>
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>JPG · PNG · GIF · WebP</span>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                        {pendingImages.map(img => (
                          <div key={img.id} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <img src={img.previewUrl} alt={img.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {/* Uploading overlay */}
                            {img.status === 'uploading' && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Loader2 size={18} style={{ color: '#fff', animation: 'spin-anim 1s linear infinite' }} />
                              </div>
                            )}
                            {img.status === 'error' && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>오류</span>
                              </div>
                            )}
                            {/* Delete button */}
                            {img.status !== 'uploading' && (
                              <button
                                type="button"
                                onClick={() => removeImage(img.id)}
                                style={{ position: 'absolute', top: '3px', right: '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(15,23,42,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                              >
                                <X size={10} style={{ color: '#fff' }} />
                              </button>
                            )}
                          </div>
                        ))}
                        {/* Add more button inside thumbnail grid */}
                        {pendingImages.length < 10 && (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{ width: '72px', height: '72px', borderRadius: '8px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', flexShrink: 0 }}
                          >
                            <ImagePlus size={18} style={{ color: '#94a3b8' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={handleFileInputChange} style={{ display: 'none' }} />
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div
            className="modal-footer"
            style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}
          >
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={isSubmitting} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', opacity: isSubmitting ? 0.5 : 1 }}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', border: 'none', background: 'var(--accent-indigo)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)', transition: 'all 0.15s', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              {isSubmitting ? '업로드 중...' : '생성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
