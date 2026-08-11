import React, { useState } from 'react';
import {
    Info, Calendar, Clock, History,
    FileText, CheckCircle, MessageSquare, Pin,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, X as XIcon
} from 'lucide-react';
import type {
    CustomerInquiry,
    InquiryStatus,
    OperatorInfo,
} from '../types/inquiry';
import { inquiryApi } from '../api/inquiryApi';
import { InquiryTimeline } from './InquiryTimeline';
import { InquiryImageViewer } from './InquiryImageViewer';
import { buildInquiryTimeline } from '../features/inquiry/timeline';
import { useInquiryActivity } from '../hooks/useInquiryActivity';
import { useInquiryFieldEditor } from '../hooks/useInquiryFieldEditor';
import { InquiryActionModal } from './InquiryActionModal';
import type { InquiryActionModalState } from './InquiryActionModal';
import { InquiryChannelMetadataSection, InquiryDeviceInfoSection } from './InquiryMetadataSections';

const getErrorMessage = (error: unknown): string => (
    error instanceof Error ? error.message : String(error)
);

interface InquiryDetailPanelProps {
    inquiry: CustomerInquiry;
    operator: OperatorInfo | null;
    onUpdateInquiry?: (id: string, updatedFields: Partial<CustomerInquiry>) => void;
    isBookmarked?: boolean;
    onToggleBookmark?: (id: string) => Promise<void> | void;
    onRequireNaverSessionRenew?: () => void;
}

export const InquiryDetailPanel: React.FC<InquiryDetailPanelProps> = ({ inquiry, operator, onUpdateInquiry, isBookmarked = false, onToggleBookmark, onRequireNaverSessionRenew }) => {
    const {
        workLogs,
        loadingLogs,
        logError,
        setLogError,
        replies,
        loadingReplies,
        refreshing,
        fetchWorkLogs,
        refreshInquiry: handleRefresh,
    } = useInquiryActivity({
        inquiryId: inquiry.id,
        onInquiryRefresh: (updated) => onUpdateInquiry?.(inquiry.id, updated),
        onRequireNaverSessionRenew,
    });

    // Resizable columns states
    const [leftWidth, setLeftWidth] = useState(75); // Left Pane % (default 75)
    const [isResizingLeft, setIsResizingLeft] = useState(false);

    // Collapsible states
    const [isActionsCollapsed, setIsActionsCollapsed] = useState(false);
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

    // Form states
    const [answerText, setAnswerText] = useState('');
    const [memoText, setMemoText] = useState('');
    const [submittingLog, setSubmittingLog] = useState(false);
    const [statusChanging, setStatusChanging] = useState(false);
    const [isEditingAnswer, setIsEditingAnswer] = useState(false);
    const [bookmarkChanging, setBookmarkChanging] = useState(false);

    // Confirmation Modal state
    const [modal, setModal] = useState<InquiryActionModalState>({
        isOpen: false,
        type: 'STATUS_CHANGE',
    });

    const [statusChangeReason, setStatusChangeReason] = useState('');

    // Image preview state
    const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

    const selectImage = (imageUrl: string | null) => {
        setActiveImageUrl(imageUrl);
    };

    const currentOperator = operator ?? {
        id: 'unknown',
        nickname: '알 수 없음',
        email: '',
        role: 'OPERATOR'
    };

    const fieldEditor = useInquiryFieldEditor({
        inquiry,
        operator: currentOperator,
        onUpdateInquiry,
        onSaved: fetchWorkLogs,
        onClearActiveImage: () => selectImage(null),
    });

    const {
        isEditing,
        savingFields,
        editContent,
        setEditContent,
        editError,
        reasons,
        setReasons,
        editImageUrls,
        newImageFiles,
        imageInputRef,
        contentTextareaRef,
        gutterRef,
        startEditing: handleStartEdit,
        cancelEditing: handleCancelEdit,
        addImages: handleAddEditImages,
        removeExistingImage: handleRemoveExistingImage,
        removeNewImage: handleRemoveNewImage,
        saveFields: executeEditFields,
    } = fieldEditor;

    const startResizingLeft = (mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizingLeft(true);
        const startX = mouseDownEvent.clientX;
        const startLeftWidth = leftWidth;
        const containerWidth = document.querySelector('.detail-modal-body')?.clientWidth || 1000;

        const onMouseMove = (mouseMoveEvent: MouseEvent) => {
            const deltaX = mouseMoveEvent.clientX - startX;
            const deltaPercent = (deltaX / containerWidth) * 100;
            const newLeftWidth = Math.max(50, Math.min(80, startLeftWidth + deltaPercent));
            setLeftWidth(newLeftWidth);
        };

        const onMouseUp = () => {
            setIsResizingLeft(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return new Intl.DateTimeFormat('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    const getStatusKorean = (status: string) => {
        switch (status) {
            case 'OPEN': return '미처리';
            case 'IN_PROGRESS': return '진행중';
            case 'RESOLVED': return '완료';
            default: return status;
        }
    };

    const getChannelInfo = (channel: string) => {
        const normalized = channel.toUpperCase();
        if (normalized.includes('NAVER_CAFE') || normalized.includes('CAFE')) {
            return { className: 'naver_cafe', label: '네이버 카페' };
        }
        if (normalized.includes('EMAIL')) {
            return { className: 'email', label: '이메일' };
        }
        if (normalized.includes('GOOGLE_SHEET') || normalized.includes('SHEET')) {
            return { className: 'google_sheet', label: '구글 시트' };
        }
        if (normalized.includes('PHONE')) {
            return { className: 'phone', label: '전화 접수' };
        }
        return { className: 'manual', label: channel };
    };

    const handleRegisterWorkLogClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!answerText.trim() && !memoText.trim()) {
            setLogError('답변 내용 또는 메모 내용을 입력해 주세요.');
            return;
        }
        setLogError(null);
        setModal({
            isOpen: true,
            type: 'REGISTER_LOG',
            selectedStatus: inquiry.status
        });
    };

    const handleStatusChangeClick = (newStatus: InquiryStatus) => {
        if (newStatus === inquiry.status) return;
        setLogError(null);
        setStatusChangeReason('');
        setModal({
            isOpen: true,
            type: 'STATUS_CHANGE',
            targetStatus: newStatus
        });
    };

    const executeRegisterWorkLog = async () => {
        setSubmittingLog(true);
        setLogError(null);
        try {
            await inquiryApi.createWorkLog(inquiry.id, {
                operatorInfo: currentOperator,
                answer: answerText.trim() || undefined,
                memo: memoText.trim() || undefined
            });

            if (modal.selectedStatus && modal.selectedStatus !== inquiry.status) {
                const changeReason = memoText.trim().length >= 5
                    ? memoText.trim()
                    : (answerText.trim().length >= 5
                        ? answerText.trim()
                        : '답변/메모 등록에 따른 상태 변경');
                await inquiryApi.updateInquiryStatus(inquiry.id, {
                    operatorInfo: currentOperator,
                    status: modal.selectedStatus,
                    reason: changeReason
                });
                if (onUpdateInquiry) {
                    onUpdateInquiry(inquiry.id, { status: modal.selectedStatus });
                }
            }

            setAnswerText('');
            setMemoText('');
            setIsEditingAnswer(false);
            await fetchWorkLogs();
            setModal({ isOpen: false, type: 'REGISTER_LOG' });
        } catch (err) {
            console.error(err);
            setLogError('등록 중 문제가 발생했습니다: ' + getErrorMessage(err));
        } finally {
            setSubmittingLog(false);
        }
    };

    const executeStatusChange = async () => {
        const targetStatus = modal.targetStatus;
        if (!targetStatus) return;
        if (statusChangeReason.trim().length < 5) {
            setLogError('상태 변경 사유는 최소 5자 이상이어야 합니다.');
            return;
        }

        setStatusChanging(true);
        setLogError(null);
        try {
            await inquiryApi.updateInquiryStatus(inquiry.id, {
                operatorInfo: currentOperator,
                status: targetStatus,
                reason: statusChangeReason.trim()
            });
            await fetchWorkLogs();
            if (onUpdateInquiry) {
                onUpdateInquiry(inquiry.id, { status: targetStatus });
            }
            setModal({ isOpen: false, type: 'STATUS_CHANGE' });
            setStatusChangeReason('');
        } catch (err) {
            console.error(err);
            setLogError('상태 변경에 실패했습니다: ' + getErrorMessage(err));
        } finally {
            setStatusChanging(false);
        }
    };

    const handleToggleBookmark = () => {
        if (!onToggleBookmark || bookmarkChanging) return;
        setModal({
            isOpen: true,
            type: 'BOOKMARK'
        });
    };

    const executeToggleBookmark = async () => {
        if (!onToggleBookmark || bookmarkChanging) return;
        setBookmarkChanging(true);
        setModal(prev => ({ ...prev, isOpen: false }));
        try {
            await onToggleBookmark(inquiry.id);
            fetchWorkLogs();
        } finally {
            setBookmarkChanging(false);
        }
    };

    const getStatusHeaderStyle = (status: string) => {
        let bgColor = 'var(--status-open)';
        if (status === 'IN_PROGRESS') {
            bgColor = 'var(--status-inprogress)';
        } else if (status === 'RESOLVED') {
            bgColor = 'var(--status-resolved)';
        }

        return {
            background: bgColor,
            color: '#ffffff',
            padding: '16px 20px',
            borderBottom: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
        };
    };

    const channelInfo = getChannelInfo(inquiry.channel);
    const latestAnswerLog = workLogs.find(log => log.answer && log.answer.trim() !== '');

    const getDisplayImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            if (url.includes('/attachments/')) {
                const parts = url.split('/attachments/');
                return `${window.location.origin}/attachments/${parts[1]}`;
            }
            return url;
        }
        if (url.includes('/attachments/')) {
            const parts = url.split('/attachments/');
            return `${window.location.origin}/attachments/${parts[1]}`;
        }
        if (url.startsWith('/')) {
            return `${window.location.origin}${url}`;
        }
        return `${window.location.origin}/attachments/cs-application/${url}`;
    };

    const timelineItems = buildInquiryTimeline(
        inquiry,
        workLogs,
        replies,
        channelInfo.label,
    );

    const isContentLong = (inquiry.content?.length || 0) > 250 || (inquiry.content?.split('\n').length || 0) > 6;

    const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (gutterRef.current) {
            gutterRef.current.scrollTop = e.currentTarget.scrollTop;
        }
    };

    const renderCustomerContent = () => {
        const lines = (inquiry.content || '').split('\n');
        const editLines = (editContent || '').split('\n');
        return (
            <div className={`detail-query-box ${inquiry.status.toLowerCase()}`} style={{ margin: 0, display: 'flex', flexDirection: 'column', height: 'auto', flex: 1, padding: 0, border: 'none', background: 'transparent' }}>
                {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{
                            display: 'flex',
                            position: 'relative',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            background: '#f8fafc',
                            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            overflow: 'hidden',
                            height: 'auto',
                            minHeight: '150px',
                            flex: 1
                        }}>
                            {/* Line Number Gutter (Scroll synchronized) */}
                            <div
                                ref={gutterRef}
                                style={{
                                    width: '45px',
                                    minWidth: '45px',
                                    background: '#f1f5f9',
                                    borderRight: '1px solid #cbd5e1',
                                    padding: '12px 0',
                                    color: '#64748b',
                                    textAlign: 'right',
                                    paddingRight: '12px',
                                    userSelect: 'none',
                                    overflowY: 'hidden',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {editLines.map((_, idx) => (
                                    <div key={idx} style={{ height: '20.8px', fontSize: '12px', lineHeight: '20.8px' }}>
                                        {idx + 1}
                                    </div>
                                ))}
                            </div>

                            {/* Textarea */}
                            <textarea
                                ref={contentTextareaRef}
                                id="edit-content"
                                className="form-textarea"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onScroll={handleTextareaScroll}
                                wrap="off"
                                placeholder="문의 내용을 입력하세요"
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#0f172a',
                                    padding: '12px 16px',
                                    margin: 0,
                                    fontSize: '13px',
                                    lineHeight: '1.6',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    overflowX: 'auto',
                                    overflowY: 'auto',
                                    boxSizing: 'border-box',
                                    height: '100%',
                                    minHeight: '130px'
                                }}
                            />
                        </div>
                        {editContent !== inquiry.content && (
                            <input
                                type="text"
                                className="text-input"
                                placeholder="문의 내용 수정 사유를 입력하세요 (필수)"
                                value={reasons.content || ''}
                                onChange={(e) => setReasons({ ...reasons, content: e.target.value })}
                                style={{ marginTop: '6px', fontSize: '11px', borderColor: 'var(--accent-indigo)', padding: '6px 10px', height: '28px' }}
                                required
                            />
                        )}
                    </div>
                ) : (
                    <div style={{
                        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        background: '#f8fafc',
                        color: '#0f172a',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '12px 0',
                        flex: 1
                    }}>
                        {lines.map((line, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    width: '100%',
                                    padding: '0 16px 0 0',
                                    transition: 'background-color 0.1s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div
                                    style={{
                                        width: '45px',
                                        minWidth: '45px',
                                        textAlign: 'right',
                                        paddingRight: '12px',
                                        color: '#64748b',
                                        userSelect: 'none',
                                        borderRight: '1px solid #cbd5e1',
                                        marginRight: '12px',
                                        fontSize: '12px',
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    {idx + 1}
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        fontFamily: 'inherit',
                                        color: '#0f172a'
                                    }}
                                >
                                    {line || '\u00A0'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderCustomerContentSection = () => (
        <div
            className="detail-section"
            style={{
                gap: '8px',
                display: 'flex',
                flexDirection: 'column',
                flex: activeImageUrl ? 1 : 1.3,
                transition: 'flex 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                height: '100%'
            }}
        >
            <span className="detail-title">
                <FileText size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                고객 접수 내용
            </span>
            {renderCustomerContent()}
        </div>
    );

    const renderAttachedImagesSection = () => {
        if (activeImageUrl) return null;
        if (!((inquiry.imageUrls && inquiry.imageUrls.length > 0) || isEditing)) return null;
        return (
            <div className="detail-section" style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
                <span className="detail-title">
                    <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    첨부 이미지 {isEditing && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(최대 10개)</span>}
                </span>
                <div
                    className="detail-query-images"
                    style={{
                        padding: '12px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                        alignItems: 'flex-start',
                        alignContent: 'flex-start',
                        overflowY: 'auto',
                        minHeight: '120px',
                        flex: 1
                    }}
                >
                    {isEditing ? (
                        <>
                            {editImageUrls.map((url: string, index: number) => (
                                <div key={`exist-${index}`} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                                    <img src={getDisplayImageUrl(url)} alt={`exist-media-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExistingImage(url)}
                                        style={{
                                            position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%',
                                            background: 'rgba(15,23,42,0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <XIcon size={10} style={{ color: '#fff' }} />
                                    </button>
                                </div>
                            ))}
                            {newImageFiles.map((img) => (
                                <div key={img.id} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                                    <img src={img.previewUrl} alt={img.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveNewImage(img.id)}
                                        style={{
                                            position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%',
                                            background: 'rgba(15,23,42,0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <XIcon size={10} style={{ color: '#fff' }} />
                                    </button>
                                </div>
                            ))}
                            {editImageUrls.length + newImageFiles.length < 10 && (
                                <div
                                    onClick={() => imageInputRef.current?.click()}
                                    style={{
                                        width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed #cbd5e1',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', background: '#ffffff', gap: '3px', transition: 'all 0.15s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
                                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                >
                                    <ImagePlus size={18} style={{ color: '#94a3b8' }} />
                                    <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 600 }}>추가</span>
                                </div>
                            )}
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                multiple
                                onChange={handleAddEditImages}
                                style={{ display: 'none' }}
                            />
                        </>
                    ) : (
                        inquiry.imageUrls?.map((url: string, index: number) => {
                            const isActive = activeImageUrl === url;
                            return (
                                <a
                                    key={index}
                                    href={getDisplayImageUrl(url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: 'block' }}
                                    onClick={(e) => {
                                        if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                                            e.preventDefault();
                                            selectImage(isActive ? null : url);
                                        }
                                    }}
                                >
                                    <img
                                        src={getDisplayImageUrl(url)}
                                        alt={`inquiry-media-${index}`}
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            objectFit: 'cover',
                                            borderRadius: '8px',
                                            border: isActive ? '2px solid var(--accent-indigo)' : '1px solid var(--border-light)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease-in-out',
                                            opacity: isActive ? 1 : 0.85
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.opacity = '1';
                                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.opacity = isActive ? '1' : '0.85';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                </a>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="detail-pane-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="detail-pane-header" style={getStatusHeaderStyle(inquiry.status)}>
                <div className="detail-modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span
                        className={`channel-badge ${channelInfo.className}`}
                        style={{
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            color: '#ffffff',
                            background: 'rgba(255, 255, 255, 0.15)'
                        }}
                    >
                        {channelInfo.label}
                    </span>
                    {inquiry.isManual && (
                        <span
                            className="channel-badge manual"
                            style={{
                                border: '1px solid #f59e0b',
                                color: '#d97706',
                                background: '#fef3c7',
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '4px'
                            }}
                        >
                            수동 등록
                        </span>
                    )}
                    <span className="detail-modal-title" style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
                        {inquiry.userCode || '비회원 (익명)'} 님의 문의 상세
                    </span>
                    <span className="inquiry-time" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {formatDate(inquiry.timestamp)}
                    </span>
                    <span
                        className={`status-badge ${inquiry.status.toLowerCase()}`}
                        style={{
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            color: '#ffffff',
                            background: 'rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        {getStatusKorean(inquiry.status)}
                    </span>
                </div>
            </div>

            {/* Pane Split Body */}
            <div className="detail-modal-body" style={{ flex: 1, minHeight: 0 }}>
                {/* Left Pane: CS Reference + Support Actions */}
                <div
                    className="detail-modal-left-pane"
                    style={{
                        width: isHistoryCollapsed ? 'calc(100% - 48px)' : `${leftWidth}%`,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        padding: '12px 12px',
                        overflow: 'hidden',
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        gap: '10px'
                    }}
                >
                    {/* Top Area: Reference + Preview (Row container) */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        gap: 0,
                        minHeight: 0,
                        width: '100%'
                    }}>
                        {/* Left Side: Ticket Reference */}
                        <div
                            className="cs-card"
                            style={{
                                flex: activeImageUrl ? 1 : 1,
                                display: 'flex',
                                flexDirection: 'column',
                                background: '#ffffff',
                                border: '1px solid var(--border-light)',
                                borderRadius: '12px',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                                overflow: 'hidden',
                                minHeight: 0,
                                transition: 'flex 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                        {/* Fixed Header */}
                        <div
                            className="cs-panel-section-title"
                            style={{
                                margin: 0,
                                padding: '10px 16px',
                                borderBottom: '1px solid var(--border-light)',
                                background: 'rgba(99, 102, 241, 0.02)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={16} style={{ color: 'var(--accent-indigo)' }} />
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>문의 참조 정보</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {!isEditing && onToggleBookmark && (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            padding: 0,
                                            borderRadius: '8px',
                                            cursor: bookmarkChanging ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isBookmarked ? '#d97706' : 'var(--text-muted)',
                                            background: isBookmarked ? 'rgba(217, 119, 6, 0.08)' : '#ffffff',
                                            borderColor: isBookmarked ? 'rgba(217, 119, 6, 0.28)' : 'var(--border-light)'
                                        }}
                                        onClick={handleToggleBookmark}
                                        disabled={bookmarkChanging}
                                        title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 등록'}
                                        aria-label={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 등록'}
                                    >
                                        <Star size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
                                    </button>
                                )}
                                {isEditing ? (
                                    <>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            style={{ padding: '0 14px', fontSize: '12.5px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={handleCancelEdit}
                                        >
                                            취소
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            style={{ padding: '0 14px', fontSize: '12.5px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            onClick={executeEditFields}
                                            disabled={savingFields}
                                        >
                                            {savingFields && <Loader2 size={12} style={{ animation: 'spin-anim 1s linear infinite' }} />}
                                            저장
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ padding: '0 14px', fontSize: '12.5px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                        onClick={handleStartEdit}
                                    >
                                        정보 수정
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0 }}>
                            {editError && (
                                <div style={{ color: '#f87171', fontSize: '13px', padding: '8px 12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '8px', border: '1px solid rgba(248, 113, 113, 0.2)', marginBottom: '4px' }}>
                                    ⚠️ {editError}
                                </div>
                            )}

                            {(isContentLong || activeImageUrl) ? (
                                /* Long Content Layout / 3-Column Layout: Left Column (Content), Right Column (Images + Metadata + Device Info) */
                                <div style={{
                                    display: 'flex',
                                    flexDirection: activeImageUrl ? 'column' : 'row',
                                    gap: '20px',
                                    alignItems: 'flex-start',
                                    width: '100%',
                                    transition: 'gap 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}>
                                    {/* Left Column */}
                                    {renderCustomerContentSection()}

                                    {/* Right Column */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '20px',
                                            flex: 1,
                                            maxWidth: '100%',
                                            maxHeight: 'none',
                                            opacity: 1,
                                            overflow: 'hidden',
                                            pointerEvents: 'auto',
                                            transition: 'flex 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: activeImageUrl ? 'static' : 'sticky',
                                            top: activeImageUrl ? undefined : '0px'
                                        }}
                                    >
                                        {renderAttachedImagesSection()}
                                        <InquiryChannelMetadataSection inquiry={inquiry} editor={fieldEditor} refreshing={refreshing} onRefresh={handleRefresh} />
                                        <InquiryDeviceInfoSection device={inquiry.deviceInfo} editor={fieldEditor} />
                                    </div>
                                </div>
                            ) : (
                                /* Short Content Layout: Row 1 (Content + Images) & Row 2 (Metadata Grid) */
                                <>
                                    <div style={{
                                        display: 'flex',
                                        gap: activeImageUrl ? '0px' : '20px',
                                        alignItems: 'stretch',
                                        width: '100%',
                                        transition: 'gap 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}>
                                        {/* Left Side */}
                                        {renderCustomerContentSection()}

                                        {/* Right Side (Attached Images) */}
                                        {((inquiry.imageUrls && inquiry.imageUrls.length > 0) || isEditing) && (
                                            <div
                                                style={{
                                                    flex: activeImageUrl ? 0 : 1,
                                                    maxWidth: activeImageUrl ? '0px' : '100%',
                                                    maxHeight: activeImageUrl ? '0px' : 'none',
                                                    opacity: activeImageUrl ? 0 : 1,
                                                    overflow: 'hidden',
                                                    pointerEvents: activeImageUrl ? 'none' : 'auto',
                                                    transition: 'flex 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }}
                                            >
                                                {renderAttachedImagesSection()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Metadata Tables: Grid side-by-side */}
                                    <div style={{
                                        display: activeImageUrl ? 'flex' : 'grid',
                                        flexDirection: activeImageUrl ? 'column' : undefined,
                                        gridTemplateColumns: activeImageUrl ? undefined : '1.2fr 1fr',
                                        gap: '20px',
                                        flexShrink: 0
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            flex: 1
                                        }}>
                                            <InquiryChannelMetadataSection inquiry={inquiry} editor={fieldEditor} refreshing={refreshing} onRefresh={handleRefresh} />
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            flex: 1
                                        }}>
                                            <InquiryDeviceInfoSection device={inquiry.deviceInfo} editor={fieldEditor} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Image Preview Card */}
                    <InquiryImageViewer
                        imageUrls={inquiry.imageUrls || []}
                        activeImageUrl={activeImageUrl}
                        getImageUrl={getDisplayImageUrl}
                        onSelectImage={selectImage}
                    />
                </div>

                    {/* Bottom: Support Actions Console */}
                    <div
                        className="cs-action-console cs-card"
                        style={{
                            flexShrink: 0,
                            background: '#ffffff',
                            border: '1px solid var(--border-light)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            height: 'auto',
                            overflowY: 'visible',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        {/* Toggle Header Button */}
                        <button
                            type="button"
                            onClick={() => setIsActionsCollapsed(!isActionsCollapsed)}
                            style={{
                                width: '100%',
                                background: isActionsCollapsed ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.02)',
                                border: 'none',
                                borderBottom: isActionsCollapsed ? 'none' : '1px solid var(--border-light)',
                                padding: '10px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                outline: 'none'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = isActionsCollapsed ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.02)'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={16} style={{ color: 'var(--accent-indigo)' }} />
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>실시간 티켓 처리 콘솔</span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600' }}>
                                <span>{isActionsCollapsed ? '펼치기' : '접기'}</span>
                                {isActionsCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                        </button>

                        {/* Collapsible content */}
                        <div
                            style={{
                                padding: '16px 20px',
                                display: isActionsCollapsed ? 'none' : 'grid',
                                gridTemplateColumns: '1fr 3.2fr', /* Wide area for side-by-side textareas */
                                gap: '24px',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {/* Left Side: Status Change Buttons */}
                            <div
                                className="status-control-container"
                                style={{
                                    margin: 0,
                                    background: 'none',
                                    border: 'none',
                                    borderRadius: 0,
                                    padding: '0 24px 0 0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    justifyContent: 'flex-start',
                                    alignItems: 'stretch',
                                    borderRight: '1px solid var(--border-light)',
                                    boxShadow: 'none'
                                }}
                            >
                                <span className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                    <Clock size={12} style={{ verticalAlign: 'middle' }} />
                                    티켓 상태 즉시 변경
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        type="button"
                                        className={`btn-status-change open ${inquiry.status === 'OPEN' ? 'active' : ''}`}
                                        style={inquiry.status === 'OPEN' ? {
                                            background: 'var(--status-open)',
                                            color: '#ffffff',
                                            borderColor: 'var(--status-open)',
                                            fontWeight: '700',
                                            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
                                            padding: '8px 12px',
                                            fontSize: '12.5px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            width: '100%',
                                            textAlign: 'center'
                                        } : {
                                            padding: '8px 12px',
                                            fontSize: '12.5px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            width: '100%',
                                            textAlign: 'center',
                                            background: '#ffffff',
                                            border: '1px solid var(--border-light)',
                                            color: 'var(--text-secondary)'
                                        }}
                                        disabled={statusChanging || inquiry.status === 'OPEN'}
                                        onClick={() => handleStatusChangeClick('OPEN')}
                                    >
                                        미처리
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn-status-change inprogress ${inquiry.status === 'IN_PROGRESS' ? 'active' : ''}`}
                                        style={inquiry.status === 'IN_PROGRESS' ? {
                                            background: 'var(--status-inprogress)',
                                            color: '#ffffff',
                                            borderColor: 'var(--status-inprogress)',
                                            fontWeight: '700',
                                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                            padding: '8px 12px',
                                            fontSize: '12.5px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            width: '100%',
                                            textAlign: 'center'
                                        } : {
                                            padding: '8px 12px',
                                            fontSize: '12.5px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            width: '100%',
                                            textAlign: 'center',
                                            background: '#ffffff',
                                            border: '1px solid var(--border-light)',
                                            color: 'var(--text-secondary)'
                                        }}
                                        disabled={statusChanging || inquiry.status === 'IN_PROGRESS'}
                                        onClick={() => handleStatusChangeClick('IN_PROGRESS')}
                                    >
                                        진행중
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn-status-change resolved ${inquiry.status === 'RESOLVED' ? 'active' : ''}`}
                                        style={inquiry.status === 'RESOLVED' ? {
                                            background: 'var(--status-resolved)',
                                            color: '#ffffff',
                                            borderColor: 'var(--status-resolved)',
                                            fontWeight: '700',
                                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                                            padding: '8px 12px',
                                            fontSize: '12.5px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            width: '100%',
                                            textAlign: 'center'
                                        } : {
                                            padding: '8px 12px',
                                            fontSize: '12.5px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            width: '100%',
                                            textAlign: 'center',
                                            background: '#ffffff',
                                            border: '1px solid var(--border-light)',
                                            color: 'var(--text-secondary)'
                                        }}
                                        disabled={statusChanging || inquiry.status === 'RESOLVED'}
                                        onClick={() => handleStatusChangeClick('RESOLVED')}
                                    >
                                        완료
                                    </button>
                                </div>
                            </div>

                            {/* Right Side: Answer and Memo Inputs (Side-by-side split layout) */}
                            <div className="work-log-form-container" style={{ border: 'none', padding: 0, margin: 0 }}>
                                <form className="work-log-form" onSubmit={handleRegisterWorkLogClick} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>
                                        {/* Official Answer Section */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label htmlFor={`answer-${inquiry.id}`} className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                                                    <MessageSquare size={12} style={{ verticalAlign: 'middle' }} />
                                                    {latestAnswerLog && !isEditingAnswer ? '등록된 공식 답변' : '공식 답변 등록'}
                                                </label>
                                                {latestAnswerLog && (
                                                    isEditingAnswer ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsEditingAnswer(false);
                                                                setAnswerText('');
                                                            }}
                                                            style={{
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: 'var(--text-muted)',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                transition: 'background 0.15s'
                                                            }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            수정 취소
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsEditingAnswer(true);
                                                                setAnswerText(latestAnswerLog.answer || '');
                                                            }}
                                                            style={{
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: 'var(--accent-indigo)',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                transition: 'background 0.15s'
                                                            }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            수정하기
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                            {latestAnswerLog && !isEditingAnswer ? (
                                                <div
                                                    style={{
                                                        minHeight: '100px',
                                                        height: '100px',
                                                        padding: '12px',
                                                        fontSize: '12.5px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border-light)',
                                                        background: 'rgba(99, 102, 241, 0.02)',
                                                        color: 'var(--text-primary)',
                                                        overflowY: 'auto',
                                                        whiteSpace: 'pre-wrap',
                                                        lineHeight: '1.4'
                                                    }}
                                                >
                                                    {latestAnswerLog.answer}
                                                </div>
                                            ) : (
                                                <textarea
                                                    id={`answer-${inquiry.id}`}
                                                    className="form-textarea textarea-answer"
                                                    placeholder="고객에게 전달될 공식 답변을 입력하세요..."
                                                    value={answerText}
                                                    onChange={(e) => setAnswerText(e.target.value)}
                                                    style={{
                                                        minHeight: '100px',
                                                        height: '100px',
                                                        padding: '12px',
                                                        fontSize: '12.5px',
                                                        borderRadius: '8px',
                                                        resize: 'none',
                                                        border: '1px solid var(--border-light)',
                                                        background: '#ffffff'
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* Private Memo Section */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label htmlFor={`memo-${inquiry.id}`} className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', cursor: 'pointer' }}>
                                                <Pin size={12} style={{ verticalAlign: 'middle' }} />
                                                관리자 비공개 메모
                                            </label>
                                            <textarea
                                                id={`memo-${inquiry.id}`}
                                                className="form-textarea textarea-memo"
                                                placeholder="관리자 전용 내부 비공개 메모를 입력하세요..."
                                                value={memoText}
                                                onChange={(e) => setMemoText(e.target.value)}
                                                style={{
                                                    minHeight: '100px',
                                                    height: '100px',
                                                    padding: '12px',
                                                    fontSize: '12.5px',
                                                    borderRadius: '8px',
                                                    resize: 'none',
                                                    border: '1px solid var(--border-light)',
                                                    background: '#ffffff'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            disabled={submittingLog}
                                            style={{ padding: '0 16px', fontSize: '12.5px', fontWeight: '600', borderRadius: '8px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {latestAnswerLog && !isEditingAnswer ? (
                                                submittingLog ? '메모 등록 중...' : '메모 등록'
                                            ) : (
                                                submittingLog ? '등록 중...' : '답변 및 메모 등록'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Divider 1 */}
                {!isHistoryCollapsed && (
                    <div
                        className={`resize-divider ${isResizingLeft ? 'active' : ''}`}
                        onMouseDown={startResizingLeft}
                    />
                )}

                {/* Right Pane: CS Work History (With Slide Collapse support) */}
                <div
                    className="detail-modal-right-pane"
                    style={{
                        width: isHistoryCollapsed ? '48px' : `${100 - leftWidth}%`,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        padding: isHistoryCollapsed ? '12px 0' : '12px 16px',
                        overflow: 'hidden',
                        borderLeft: '1px solid var(--border-light)',
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease',
                        background: 'var(--bg-secondary)',
                        flexShrink: 0
                    }}
                >
                    {isHistoryCollapsed ? (
                        /* ── Collapsed Work History Column ── */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', width: '100%', gap: '16px' }}>
                            <button
                                type="button"
                                onClick={() => setIsHistoryCollapsed(false)}
                                title="이력 펼치기"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-light)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                    outline: 'none'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-light)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.8px',
                                    userSelect: 'none'
                                }}>
                                    업무 처리 이력
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* ── Expanded Work History Column ── */
                        <div
                            className="cs-reference-panel"
                            style={{
                                border: 'none',
                                padding: 0,
                                boxShadow: 'none',
                                background: 'transparent',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {/* Header with Collapse Button */}
                            <div
                                className="cs-panel-section-title"
                                style={{
                                    margin: 0,
                                    padding: '10px 12px',
                                    borderBottom: '1px solid var(--border-light)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexShrink: 0
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={16} style={{ color: '#64748b' }} />
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>업무 처리 이력</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsHistoryCollapsed(true)}
                                    title="이력 접기"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            <InquiryTimeline
                                items={timelineItems}
                                loadingLogs={loadingLogs}
                                loadingReplies={loadingReplies}
                                error={logError}
                                activeImageUrl={activeImageUrl}
                                getImageUrl={getDisplayImageUrl}
                                onSelectImage={selectImage}
                            />
                        </div>
                    )}
                </div>
            </div>

            <InquiryActionModal
                modal={modal}
                currentStatus={inquiry.status}
                isBookmarked={isBookmarked}
                statusChangeReason={statusChangeReason}
                error={logError}
                submitting={submittingLog || statusChanging || bookmarkChanging}
                onModalChange={setModal}
                onStatusChangeReason={setStatusChangeReason}
                onConfirm={() => {
                    if (modal.type === 'STATUS_CHANGE') {
                        executeStatusChange();
                    } else if (modal.type === 'BOOKMARK') {
                        executeToggleBookmark();
                    } else {
                        executeRegisterWorkLog();
                    }
                }}
            />
        </div>
    );
};
