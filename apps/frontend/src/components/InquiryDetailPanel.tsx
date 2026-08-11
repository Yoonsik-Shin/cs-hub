import React, { useState } from 'react';
import {
    Info, FileText, ImagePlus, Loader2, Star, X as XIcon
} from 'lucide-react';
import type {
    CustomerInquiry,
    OperatorInfo,
} from '../types/inquiry';
import { InquiryImageViewer } from './InquiryImageViewer';
import { buildInquiryTimeline } from '../features/inquiry/timeline';
import { useInquiryActivity } from '../hooks/useInquiryActivity';
import { useInquiryFieldEditor } from '../hooks/useInquiryFieldEditor';
import { InquiryActionModal } from './InquiryActionModal';
import { InquiryChannelMetadataSection, InquiryDeviceInfoSection } from './InquiryMetadataSections';
import {
    getChannelPresentation,
    IMAGE_POLICY,
} from '../features/inquiry/policy';
import { InlineAlert } from './ui/InlineAlert';
import { useInquiryActions } from '../hooks/useInquiryActions';
import { InquiryWorkConsole } from './InquiryWorkConsole';
import { InquiryHistoryPane } from './InquiryHistoryPane';
import { InquiryDetailHeader } from './InquiryDetailHeader';

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
        activityError,
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
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

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


    const {
        answerText,
        setAnswerText,
        memoText,
        setMemoText,
        submittingLog,
        statusChanging,
        isEditingAnswer,
        setIsEditingAnswer,
        latestAnswerLog,
        bookmarkChanging,
        modal,
        setModal,
        statusChangeReason,
        setStatusChangeReason,
        error: actionError,
        requestWorkLogRegistration,
        requestStatusChange: handleStatusChangeClick,
        requestBookmarkToggle: handleToggleBookmark,
        confirmModal,
    } = useInquiryActions({
        inquiry,
        operator: currentOperator,
        workLogs,
        onUpdateInquiry,
        onToggleBookmark,
        refreshWorkLogs: fetchWorkLogs,
    });

    const handleRegisterWorkLogClick = (event: React.FormEvent) => {
        event.preventDefault();
        requestWorkLogRegistration();
    };


    const channelInfo = getChannelPresentation(inquiry.channel);

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
        const imagesChanged = isEditing && (
            newImageFiles.length > 0
            || (inquiry.imageUrls || []).some((url) => !editImageUrls.includes(url))
        );
        return (
            <div className="detail-section" style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
                <span className="detail-title">
                    <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    첨부 이미지 {isEditing && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(최대 {IMAGE_POLICY.maxCount}개)</span>}
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
                            {editImageUrls.length + newImageFiles.length < IMAGE_POLICY.maxCount && (
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
                                accept={IMAGE_POLICY.allowedTypes.join(',')}
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
                {imagesChanged && (
                    <input
                        type="text"
                        className="text-input"
                        placeholder="첨부 이미지 수정 사유 (필수)"
                        value={reasons.imageUrls || ''}
                        onChange={(event) => setReasons({ ...reasons, imageUrls: event.target.value })}
                        required
                    />
                )}
            </div>
        );
    };

    return (
        <div className="detail-pane-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <InquiryDetailHeader inquiry={inquiry} />

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
                            {editError && <InlineAlert>{editError}</InlineAlert>}

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

                    <InquiryWorkConsole
                        inquiry={inquiry}
                        answerText={answerText}
                        memoText={memoText}
                        latestAnswerLog={latestAnswerLog}
                        editingAnswer={isEditingAnswer}
                        submittingLog={submittingLog}
                        statusChanging={statusChanging}
                        onAnswerTextChange={setAnswerText}
                        onMemoTextChange={setMemoText}
                        onEditingAnswerChange={setIsEditingAnswer}
                        onStatusChange={handleStatusChangeClick}
                        onSubmit={handleRegisterWorkLogClick}
                    />
                </div>

                <InquiryHistoryPane
                    leftWidth={leftWidth}
                    collapsed={isHistoryCollapsed}
                    resizing={isResizingLeft}
                    items={timelineItems}
                    loadingLogs={loadingLogs}
                    loadingReplies={loadingReplies}
                    error={activityError}
                    activeImageUrl={activeImageUrl}
                    getImageUrl={getDisplayImageUrl}
                    onSelectImage={selectImage}
                    onResizeStart={startResizingLeft}
                    onCollapsedChange={setIsHistoryCollapsed}
                />
            </div>


            <InquiryActionModal
                modal={modal}
                currentStatus={inquiry.status}
                isBookmarked={isBookmarked}
                statusChangeReason={statusChangeReason}
                error={actionError}
                submitting={submittingLog || statusChanging || bookmarkChanging}
                onModalChange={setModal}
                onStatusChangeReason={setStatusChangeReason}
                onConfirm={confirmModal}
            />
        </div>
    );
};
