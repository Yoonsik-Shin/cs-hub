import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Cpu, Info, Calendar, Clock, User, ArrowRight, History,
    FileText, CheckCircle, Inbox, MessageSquare, Pin, RefreshCw, AlertCircle,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Edit
} from 'lucide-react';
import type { CustomerInquiry, InquiryWorkLog, OperatorInfo } from '../types/inquiry';
import { inquiryApi } from '../api/inquiryApi';

interface InquiryDetailPanelProps {
    inquiry: CustomerInquiry;
    operator: OperatorInfo | null;
    onUpdateInquiry?: (id: string, updatedFields: Partial<CustomerInquiry>) => void;
}

export const InquiryDetailPanel: React.FC<InquiryDetailPanelProps> = ({ inquiry, operator, onUpdateInquiry }) => {
    const [workLogs, setWorkLogs] = useState<InquiryWorkLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logError, setLogError] = useState<string | null>(null);

    // Resizable columns states
    const [leftWidth, setLeftWidth] = useState(75); // Left Pane % (default 75)
    const [isResizingLeft, setIsResizingLeft] = useState(false);

    // Collapsible states
    const [isActionsCollapsed, setIsActionsCollapsed] = useState(false);
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

    // Form states
    const [isEditing, setIsEditing] = useState(false);
    const [answerText, setAnswerText] = useState('');
    const [memoText, setMemoText] = useState('');
    const [submittingLog, setSubmittingLog] = useState(false);
    const [statusChanging, setStatusChanging] = useState(false);

    // Confirmation Modal state
    const [modal, setModal] = useState<{
        isOpen: boolean;
        type: 'STATUS_CHANGE' | 'REGISTER_LOG' | 'EDIT_FIELDS';
        targetStatus?: string;
        selectedStatus?: string;
    }>({
        isOpen: false,
        type: 'STATUS_CHANGE',
    });

    const [editChannel, setEditChannel] = useState(inquiry.channel);
    const [editUserCode, setEditUserCode] = useState(inquiry.userCode || '');
    const [editContent, setEditContent] = useState(inquiry.content);
    const [editAppVersion, setEditAppVersion] = useState(inquiry.deviceInfo?.appVersion || '');
    const [editModel, setEditModel] = useState(inquiry.deviceInfo?.model || '');
    const [editOsVersion, setEditOsVersion] = useState(inquiry.deviceInfo?.osVersion || '');
    const [editError, setEditError] = useState<string | null>(null);

    // Reasons for modification
    const [reasons, setReasons] = useState<{
        channel?: string;
        userCode?: string;
        deviceInfo?: string;
        content?: string;
    }>({});

    const currentOperator = operator ?? {
        id: 'unknown',
        nickname: '알 수 없음',
        email: ''
    };

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
        } catch (e) {
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

    const getActionKorean = (actionType: string) => {
        switch (actionType) {
            case 'ANSWER_SUBMITTED': return '답변 등록';
            case 'MEMO_ADDED': return '메모 등록';
            case 'ANSWER_AND_MEMO_SUBMITTED': return '답변 및 메모 등록';
            case 'STATUS_CHANGED': return '상태 변경';
            case 'INITIAL_SUBMISSION': return '최초 접수';
            case 'PENDING_ACTION': return '처리 대기';
            case 'FIELD_MODIFIED': return '정보 수정';
            default: return actionType;
        }
    };

    const getActionClass = (actionType: string) => {
        switch (actionType) {
            case 'ANSWER_SUBMITTED':
            case 'ANSWER_AND_MEMO_SUBMITTED': return 'answer';
            case 'MEMO_ADDED': return 'memo';
            case 'STATUS_CHANGED': return 'status-change';
            case 'INITIAL_SUBMISSION': return 'initial';
            case 'PENDING_ACTION': return 'pending';
            case 'FIELD_MODIFIED': return 'modify';
            default: return '';
        }
    };

    const getChannelInfo = (channel: string) => {
        const normalized = channel.toUpperCase();
        if (normalized.includes('KAKAO')) {
            return { className: 'kakao', label: '카카오톡' };
        }
        if (normalized.includes('NAVER_CAFE') || normalized.includes('CAFE')) {
            return { className: 'naver_cafe', label: '네이버 카페' };
        }
        if (normalized.includes('EMAIL')) {
            return { className: 'email', label: '이메일' };
        }
        if (normalized.includes('MANUAL')) {
            return { className: 'manual', label: '수동 생성' };
        }
        return { className: 'manual', label: channel };
    };

    const fetchWorkLogs = useCallback(async () => {
        setLoadingLogs(true);
        setLogError(null);
        try {
            const logs = await inquiryApi.getWorkLogs(inquiry.id);
            setWorkLogs(logs);
        } catch (e: any) {
            console.error(e);
            setLogError('업무 처리 이력을 불러오는 데 실패했습니다.');
        } finally {
            setLoadingLogs(false);
        }
    }, [inquiry.id]);

    useEffect(() => {
        fetchWorkLogs();
        setAnswerText('');
        setMemoText('');
        setIsEditing(false); // Reset edit state when ticket changes
    }, [inquiry.id, fetchWorkLogs]);

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

    const handleStatusChangeClick = (newStatus: string) => {
        if (newStatus === inquiry.status) return;
        setLogError(null);
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
                await inquiryApi.updateInquiryStatus(inquiry.id, {
                    operatorInfo: currentOperator,
                    status: modal.selectedStatus
                });
                if (onUpdateInquiry) {
                    onUpdateInquiry(inquiry.id, { status: modal.selectedStatus as any });
                }
            }

            setAnswerText('');
            setMemoText('');
            await fetchWorkLogs();
            setModal({ isOpen: false, type: 'REGISTER_LOG' });
        } catch (err: any) {
            console.error(err);
            setLogError('등록 중 문제가 발생했습니다: ' + err.message);
        } finally {
            setSubmittingLog(false);
        }
    };

    const executeStatusChange = async () => {
        const targetStatus = modal.targetStatus;
        if (!targetStatus) return;

        setStatusChanging(true);
        setLogError(null);
        try {
            await inquiryApi.updateInquiryStatus(inquiry.id, {
                operatorInfo: currentOperator,
                status: targetStatus
            });
            await fetchWorkLogs();
            if (onUpdateInquiry) {
                onUpdateInquiry(inquiry.id, { status: targetStatus as any });
            }
            setModal({ isOpen: false, type: 'STATUS_CHANGE' });
        } catch (err: any) {
            console.error(err);
            setLogError('상태 변경에 실패했습니다: ' + err.message);
        } finally {
            setStatusChanging(false);
        }
    };

    const handleStartEdit = () => {
        setEditChannel(inquiry.channel);
        setEditUserCode(inquiry.userCode || '');
        setEditContent(inquiry.content);
        setEditAppVersion(inquiry.deviceInfo?.appVersion || '');
        setEditModel(inquiry.deviceInfo?.model || '');
        setEditOsVersion(inquiry.deviceInfo?.osVersion || '');
        setReasons({});
        setEditError(null);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditError(null);
        setReasons({});
    };

    const executeEditFields = async () => {
        const changes: any = {};
        const reqReasons: any = {};
        let hasChanges = false;

        // Check Channel
        if (editChannel !== inquiry.channel) {
            if (!reasons.channel || !reasons.channel.trim()) {
                setEditError('채널 수정 사유를 입력해주세요.');
                return;
            }
            changes.channel = editChannel;
            reqReasons.channel = reasons.channel.trim();
            hasChanges = true;
        }

        // Check User Code
        const currentUserCode = inquiry.userCode || '';
        if (editUserCode.trim() !== currentUserCode) {
            if (!reasons.userCode || !reasons.userCode.trim()) {
                setEditError('유저 코드 수정 사유를 입력해주세요.');
                return;
            }
            changes.userCode = editUserCode.trim() || null;
            reqReasons.userCode = reasons.userCode.trim();
            hasChanges = true;
        }

        // Check Content
        if (editContent !== inquiry.content) {
            if (!reasons.content || !reasons.content.trim()) {
                setEditError('문의 내용 수정 사유를 입력해주세요.');
                return;
            }
            changes.content = editContent;
            reqReasons.content = reasons.content.trim();
            hasChanges = true;
        }

        // Check Device Info
        const deviceChanged = editAppVersion.trim() !== (inquiry.deviceInfo?.appVersion || '') ||
            editModel.trim() !== (inquiry.deviceInfo?.model || '') ||
            editOsVersion.trim() !== (inquiry.deviceInfo?.osVersion || '');
        if (deviceChanged) {
            if (!reasons.deviceInfo || !reasons.deviceInfo.trim()) {
                setEditError('디바이스 정보 수정 사유를 입력해주세요.');
                return;
            }
            changes.deviceInfo = {
                appVersion: editAppVersion.trim() || undefined,
                model: editModel.trim() || undefined,
                osVersion: editOsVersion.trim() || undefined
            };
            reqReasons.deviceInfo = reasons.deviceInfo.trim();
            hasChanges = true;
        }

        if (!hasChanges) {
            setIsEditing(false);
            return;
        }

        setSubmittingLog(true);
        setEditError(null);
        try {
            await inquiryApi.updateInquiryFields(inquiry.id, {
                operatorInfo: currentOperator,
                ...changes,
                reasons: reqReasons
            });

            if (onUpdateInquiry) {
                onUpdateInquiry(inquiry.id, {
                    channel: editChannel,
                    userCode: editUserCode.trim() || null,
                    content: editContent,
                    deviceInfo: deviceChanged ? {
                        appVersion: editAppVersion.trim() || undefined,
                        model: editModel.trim() || undefined,
                        osVersion: editOsVersion.trim() || undefined
                    } : inquiry.deviceInfo
                });
            }

            await fetchWorkLogs();
            setIsEditing(false);
        } catch (err: any) {
            console.error(err);
            setEditError('수정 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setSubmittingLog(false);
        }
    };

    const getFieldLabel = (field: string) => {
        switch (field) {
            case 'channel': return '채널';
            case 'userCode': return '유저 코드';
            case 'deviceInfo': return '디바이스 정보';
            case 'content': return '문의 내용';
            default: return field;
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

    const renderChannelMetadata = (meta: any) => {
        const hasChannelChanged = editChannel !== inquiry.channel;
        const hasUserCodeChanged = editUserCode.trim() !== (inquiry.userCode || '');

        // 1. Channel Row
        const channelRow = (
            <tr key="edit-row-channel">
                <th style={{ width: '35%' }}>접수 채널</th>
                <td>
                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <select
                                id="edit-channel"
                                className="select-input"
                                value={editChannel}
                                onChange={(e) => setEditChannel(e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '12px', height: '28px', border: '1px solid var(--border-light)', borderRadius: '6px' }}
                            >
                                <option value="KAKAO">카카오톡 (KAKAO)</option>
                                <option value="NAVER_CAFE">네이버 카페 (NAVER_CAFE)</option>
                                <option value="EMAIL">이메일 (EMAIL)</option>
                                <option value="MANUAL">수동 생성 (MANUAL)</option>
                            </select>
                            {hasChannelChanged && (
                                <input
                                    type="text"
                                    className="text-input"
                                    placeholder="채널 수정 사유 (필수)"
                                    value={reasons.channel || ''}
                                    onChange={(e) => setReasons({ ...reasons, channel: e.target.value })}
                                    style={{ fontSize: '11px', borderColor: 'var(--accent-indigo)', padding: '4px 8px', height: '24px', marginTop: '2px' }}
                                    required
                                />
                            )}
                        </div>
                    ) : (
                        <span>{getChannelInfo(inquiry.channel).label} ({inquiry.channel})</span>
                    )}
                </td>
            </tr>
        );

        // 2. UserCode Row
        const userCodeRow = (
            <tr key="edit-row-usercode">
                <th>유저 코드</th>
                <td>
                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input
                                type="text"
                                id="edit-usercode"
                                className="text-input"
                                value={editUserCode}
                                onChange={(e) => setEditUserCode(e.target.value)}
                                placeholder="유저 코드 입력"
                                style={{ padding: '4px 8px', fontSize: '12px', height: '28px' }}
                            />
                            {hasUserCodeChanged && (
                                <input
                                    type="text"
                                    className="text-input"
                                    placeholder="유저 코드 수정 사유 (필수)"
                                    value={reasons.userCode || ''}
                                    onChange={(e) => setReasons({ ...reasons, userCode: e.target.value })}
                                    style={{ fontSize: '11px', borderColor: 'var(--accent-indigo)', padding: '4px 8px', height: '24px', marginTop: '2px' }}
                                    required
                                />
                            )}
                        </div>
                    ) : (
                        <span>{inquiry.userCode || '(없음)'}</span>
                    )}
                </td>
            </tr>
        );

        // 3. Other Channel specific metadata rows
        const metadataRows: React.ReactNode[] = [];
        if (meta) {
            const isNaverCafe = inquiry.channel.toUpperCase().includes('NAVER_CAFE') || meta.metadataType === 'NAVER_CAFE';
            const isGoogleSheet = inquiry.channel.toUpperCase().includes('GOOGLE_SHEET') || meta.metadataType === 'GOOGLE_SHEET';
            const isEmail = inquiry.channel.toUpperCase().includes('EMAIL') || meta.metadataType === 'EMAIL';

            if (isNaverCafe) {
                if (meta.cafeId) metadataRows.push(<tr key="cafeId"><th>카페 ID</th><td style={{ wordBreak: 'break-all' }}>{meta.cafeId}</td></tr>);
                if (meta.articleId) metadataRows.push(<tr key="articleId"><th>게시글 ID</th><td style={{ wordBreak: 'break-all' }}>{meta.articleId}</td></tr>);
                if (meta.menu) metadataRows.push(<tr key="menu"><th>게시판</th><td style={{ wordBreak: 'break-all' }}>{meta.menu.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(ID: {meta.menu.id})</span></td></tr>);
                if (meta.writer) metadataRows.push(<tr key="writer"><th>작성자</th><td style={{ wordBreak: 'break-all' }}>{meta.writer.nickname} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({meta.writer.id})</span></td></tr>);
                if (meta.metrics) {
                    metadataRows.push(
                        <tr key="metrics">
                            <th>지표</th>
                            <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    <span>조회 {meta.metrics.readCount ?? 0}</span>
                                    <span>•</span>
                                    <span>댓글 {meta.metrics.commentCount ?? 0}</span>
                                    <span>•</span>
                                    <span>좋아요 {meta.metrics.likeCount ?? 0}</span>
                                </div>
                            </td>
                        </tr>
                    );
                }
            } else if (isGoogleSheet) {
                if (meta.rowNumber) metadataRows.push(<tr key="rowNumber"><th>행 번호</th><td style={{ wordBreak: 'break-all' }}>{meta.rowNumber}번 행</td></tr>);
                if (meta.category) metadataRows.push(<tr key="category"><th>카테고리</th><td style={{ wordBreak: 'break-all' }}>{meta.category}</td></tr>);
                if (meta.type) metadataRows.push(<tr key="type"><th>문의 항목</th><td style={{ wordBreak: 'break-all' }}>{meta.type}</td></tr>);
                if (meta.contact) metadataRows.push(<tr key="contact"><th>연락처</th><td style={{ wordBreak: 'break-all' }}>{meta.contact}</td></tr>);
                if (meta.reply) {
                    metadataRows.push(
                        <tr key="reply">
                            <th>답변 수신</th>
                            <td style={{ wordBreak: 'break-all' }}>
                                {meta.reply.type} {meta.reply.email && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({meta.reply.email})</span>}
                            </td>
                        </tr>
                    );
                }
            } else if (isEmail) {
                const messageId = meta.headers ? (meta.headers['message-id'] || meta.headers.messageId) : null;
                const uid = meta.attributes ? meta.attributes.uid : null;
                if (meta.from) metadataRows.push(<tr key="from"><th>보낸 사람</th><td style={{ wordBreak: 'break-all' }}>{meta.from}</td></tr>);
                if (meta.to) metadataRows.push(<tr key="to"><th>받는 사람</th><td style={{ wordBreak: 'break-all' }}>{meta.to}</td></tr>);
                if (meta.subject) metadataRows.push(<tr key="subject"><th>제목</th><td style={{ wordBreak: 'break-all' }}>{meta.subject}</td></tr>);
                if (messageId) metadataRows.push(<tr key="messageId"><th>메시지 ID</th><td style={{ wordBreak: 'break-all', fontSize: '11px', fontFamily: 'monospace' }}>{messageId}</td></tr>);
                if (uid) metadataRows.push(<tr key="uid"><th>IMAP UID</th><td style={{ wordBreak: 'break-all' }}>{uid}</td></tr>);
                if (meta.date) metadataRows.push(<tr key="date"><th>작성 일시</th><td style={{ wordBreak: 'break-all' }}>{meta.date}</td></tr>);
            } else {
                Object.entries(meta).forEach(([key, val]) => {
                    if (key === 'metadataType' || key === 'imageUrls' || key === 'articleUrl') return;
                    metadataRows.push(
                        <tr key={key}>
                            <th style={{ textTransform: 'capitalize' }}>{key}</th>
                            <td style={{ wordBreak: 'break-all' }}>
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                        </tr>
                    );
                });
            }
        }

        return (
            <table className="profile-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <tbody>
                    {channelRow}
                    {userCodeRow}
                    {metadataRows}
                </tbody>
            </table>
        );
    };

    const renderDeviceInfo = (device: any) => {
        if (!device && !isEditing) return <div style={{ color: 'var(--text-muted)' }}>디바이스 정보 없음</div>;

        const hasDeviceInfoChanged = 
            editAppVersion.trim() !== (device?.appVersion || '') ||
            editModel.trim() !== (device?.model || '') ||
            editOsVersion.trim() !== (device?.osVersion || '');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <table className="profile-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <tbody>
                        <tr>
                            <th style={{ width: '35%' }}>앱 버전</th>
                            <td>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        id="edit-appversion"
                                        className="text-input"
                                        style={{ padding: '4px 8px', fontSize: '12px', height: '28px' }}
                                        value={editAppVersion}
                                        onChange={(e) => setEditAppVersion(e.target.value)}
                                        placeholder="예: 1.0.0"
                                    />
                                ) : (
                                    <span>{device?.appVersion || '(값 없음)'}</span>
                                )}
                            </td>
                        </tr>
                        <tr>
                            <th>기기 모델</th>
                            <td>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        id="edit-model"
                                        className="text-input"
                                        style={{ padding: '4px 8px', fontSize: '12px', height: '28px' }}
                                        value={editModel}
                                        onChange={(e) => setEditModel(e.target.value)}
                                        placeholder="예: iPhone 15"
                                    />
                                ) : (
                                    <span>{device?.model || '(값 없음)'}</span>
                                )}
                            </td>
                        </tr>
                        <tr>
                            <th>OS 버전</th>
                            <td>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        id="edit-osversion"
                                        className="text-input"
                                        style={{ padding: '4px 8px', fontSize: '12px', height: '28px' }}
                                        value={editOsVersion}
                                        onChange={(e) => setEditOsVersion(e.target.value)}
                                        placeholder="예: 17.2"
                                    />
                                ) : (
                                    <span>{device?.osVersion || '(값 없음)'}</span>
                                )}
                            </td>
                        </tr>
                        {device && Object.entries(device).map(([key, val]) => {
                            if (key === 'appVersion' || key === 'model' || key === 'osVersion') return null;
                            return (
                                <tr key={key}>
                                    <th style={{ textTransform: 'capitalize' }}>{key}</th>
                                    <td style={{ wordBreak: 'break-all' }}>
                                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {isEditing && hasDeviceInfoChanged && (
                    <input
                        type="text"
                        className="text-input"
                        placeholder="디바이스 정보 수정 사유 (필수)"
                        value={reasons.deviceInfo || ''}
                        onChange={(e) => setReasons({ ...reasons, deviceInfo: e.target.value })}
                        style={{ fontSize: '11px', borderColor: 'var(--accent-indigo)', padding: '4px 8px', height: '28px' }}
                        required
                    />
                )}
            </div>
        );
    };

    const channelInfo = getChannelInfo(inquiry.channel);

    // Construct combined timeline items (ascending order: oldest first, newest last)
    const timelineItems: any[] = [];

    // 1. Initial Customer Submission (Always added first as it is the oldest item)
    timelineItems.push({
        id: 'initial_submission',
        actionType: 'INITIAL_SUBMISSION',
        createdAt: inquiry.timestamp,
        operatorInfo: {
            id: 'customer',
            nickname: inquiry.userCode || '고객(익명)',
            email: ''
        },
        memo: `[${channelInfo.label}] 채널을 통해 문의가 정상적으로 접수되었습니다.`,
        answer: '',
        previousStatus: 'OPEN',
        currentStatus: 'OPEN'
    });

    // 2. Work logs added in ascending order (reversed from API's descending order)
    timelineItems.push(...[...workLogs].reverse());

    // 3. Pending Action Placeholder (Appended at the end of the timeline as it represents pending future action)
    if (workLogs.length === 0 && inquiry.status !== 'RESOLVED') {
        timelineItems.push({
            id: 'pending_action',
            actionType: 'PENDING_ACTION',
            createdAt: new Date().toISOString(),
            operatorInfo: {
                id: 'system',
                nickname: '배정 대기',
                email: ''
            },
            memo: '답변 등록 또는 비공개 메모 작성을 기다리고 있습니다.',
            answer: '',
            previousStatus: inquiry.status,
            currentStatus: inquiry.status
        });
    }

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
                    {/* Top: Ticket Reference (As a distinct card) */}
                    <div
                        className="cs-card"
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#ffffff',
                            border: '1px solid var(--border-light)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                            overflow: 'hidden',
                            minHeight: 0
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
                                <span>문의 참조 정보 (Ticket Reference)</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
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
                                            style={{ padding: '0 14px', fontSize: '12.5px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={executeEditFields}
                                            disabled={submittingLog}
                                        >
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
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                            {editError && (
                                <div style={{ color: '#f87171', fontSize: '13px', padding: '8px 12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '8px', border: '1px solid rgba(248, 113, 113, 0.2)', marginBottom: '4px' }}>
                                    ⚠️ {editError}
                                </div>
                            )}

                            {/* Flat Customer Message Block */}
                            <div className={`detail-query-box ${inquiry.status.toLowerCase()}`} style={{ margin: 0 }}>
                                <div className="detail-query-box-title">고객 접수 내용</div>
                                {isEditing ? (
                                    <div style={{ marginTop: '8px' }}>
                                        <textarea
                                            id="edit-content"
                                            className="form-textarea"
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            placeholder="문의 내용을 입력하세요"
                                            style={{
                                                width: '100%',
                                                minHeight: '100px',
                                                height: '100px',
                                                padding: '8px 12px',
                                                fontSize: '13px',
                                                border: '1px solid var(--border-light)',
                                                borderRadius: '8px',
                                                resize: 'none',
                                                background: '#ffffff',
                                                fontFamily: 'inherit'
                                            }}
                                        />
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
                                    <div className="detail-query-text">
                                        {inquiry.content || '(내용 없음)'}
                                    </div>
                                )}
                            </div>

                            {/* Attachment Images */}
                            {inquiry.imageUrls && inquiry.imageUrls.length > 0 && (
                                <div className="detail-section" style={{ gap: '8px', flexShrink: 0 }}>
                                    <span className="detail-title">
                                        <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                        첨부 이미지
                                    </span>
                                    <div
                                        className="detail-query-images"
                                        style={{
                                            padding: '12px',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-light)',
                                            display: 'flex',
                                            gap: '12px',
                                            flexWrap: 'wrap'
                                        }}
                                    >
                                        {inquiry.imageUrls.map((url: string, index: number) => (
                                            <a
                                                key={index}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ display: 'block' }}
                                            >
                                                <img
                                                    src={url}
                                                    alt={`inquiry-media-${index}`}
                                                    style={{
                                                        width: '120px',
                                                        height: '120px',
                                                        objectFit: 'cover',
                                                        borderRadius: '10px',
                                                        border: '1px solid var(--border-light)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease-in-out'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.transform = 'scale(1.03)';
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.transform = 'none';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Metadata Tables */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexShrink: 0 }}>
                                <div className="detail-section">
                                    <span className="detail-title">
                                        <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                        채널 메타데이터
                                    </span>
                                    <div className="detail-box" style={{ background: 'transparent', border: 'none', padding: 0, overflow: 'visible' }}>
                                        {renderChannelMetadata(inquiry.channelMetadata)}
                                        {inquiry.channelMetadata && inquiry.channelMetadata.articleUrl && (
                                            <div style={{ marginTop: '12px' }}>
                                                <a
                                                    href={inquiry.channelMetadata.articleUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-primary"
                                                    style={{ display: 'inline-flex', padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                                                >
                                                    원문 게시글 바로가기 (새 창)
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="detail-section">
                                    <span className="detail-title">
                                        <Cpu size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                        디바이스 정보
                                    </span>
                                    <div className="detail-box" style={{ background: 'transparent', border: 'none', padding: 0, overflow: 'visible' }}>
                                        {renderDeviceInfo(inquiry.deviceInfo)}
                                    </div>
                                </div>
                            </div>
                        </div>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <CheckCircle size={16} style={{ color: 'var(--accent-indigo)' }} />
                                <span>실시간 티켓 처리 콘솔 (Support Actions)</span>
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
                                            <label htmlFor={`answer-${inquiry.id}`} className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', cursor: 'pointer' }}>
                                                <MessageSquare size={12} style={{ verticalAlign: 'middle' }} />
                                                공식 답변 등록
                                            </label>
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
                                            {submittingLog ? '등록 중...' : '답변 및 메모 등록'}
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
                        padding: isHistoryCollapsed ? '12px 0' : '12px 0 12px 16px',
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
                                    margin: '0 0 12px 0',
                                    paddingRight: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexShrink: 0
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={16} style={{ color: '#64748b' }} />
                                    <span>업무 처리 이력 (Work History)</span>
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

                            {loadingLogs ? (
                                <div style={{ padding: '12px 0', flex: 1 }}>
                                    <div className="skeleton skeleton-text short" />
                                    <div className="skeleton skeleton-text" />
                                </div>
                            ) : logError ? (
                                <div style={{ color: '#f87171', fontSize: '13px', padding: '8px 0', flex: 1 }}>⚠️ {logError}</div>
                            ) : (
                                <div className="timeline-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 0 12px' }}>
                                    <div className="timeline-container">
                                        {timelineItems.map((log) => (
                                            <div key={log.id} className={`timeline-item ${getActionClass(log.actionType)}`}>
                                                <div className={`timeline-dot ${getActionClass(log.actionType)}`}>
                                                    {log.actionType === 'INITIAL_SUBMISSION' && <Inbox size={10} />}
                                                    {log.actionType === 'PENDING_ACTION' && <AlertCircle size={10} />}
                                                    {log.actionType === 'STATUS_CHANGED' && <RefreshCw size={10} />}
                                                    {(log.actionType === 'ANSWER_SUBMITTED' || log.actionType === 'ANSWER_AND_MEMO_SUBMITTED') && <MessageSquare size={10} />}
                                                    {log.actionType === 'MEMO_ADDED' && <Pin size={10} />}
                                                    {log.actionType === 'FIELD_MODIFIED' && <Edit size={10} />}
                                                </div>
                                                <div className="timeline-content">
                                                    <div className="timeline-header">
                                                        <span className={`timeline-action ${getActionClass(log.actionType)}`}>
                                                            {getActionKorean(log.actionType)}
                                                        </span>
                                                        <span className="timeline-operator">
                                                            <User size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                                                            {log.operatorInfo.nickname}
                                                        </span>
                                                        {log.actionType !== 'PENDING_ACTION' && (
                                                            <span className="timeline-date">{formatDate(log.createdAt)}</span>
                                                        )}
                                                    </div>
                                                    {log.actionType === 'STATUS_CHANGED' && log.previousStatus !== log.currentStatus && (
                                                        <div className="timeline-status-change">
                                                            {getStatusKorean(log.previousStatus || '')}
                                                            <ArrowRight size={10} style={{ margin: '0 4px' }} />
                                                            <strong>{getStatusKorean(log.currentStatus || '')}</strong>
                                                        </div>
                                                    )}
                                                    {log.actionType === 'PENDING_ACTION' || log.actionType === 'INITIAL_SUBMISSION' ? (
                                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px', lineHeight: '1.4' }}>
                                                            {log.memo}
                                                        </div>
                                                    ) : log.actionType === 'FIELD_MODIFIED' ? (
                                                        <div className="timeline-modification-container" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {log.ipAddress && (
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                    요청 IP: {log.ipAddress}
                                                                </div>
                                                            )}
                                                            {log.modificationDetails && log.modificationDetails.map((mod: any, index: number) => (
                                                                <div key={index} className="timeline-detail-box modify" style={{
                                                                    padding: '8px 12px',
                                                                    background: 'rgba(124, 58, 237, 0.03)',
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    <div style={{ fontWeight: '700', color: 'var(--accent-violet)', marginBottom: '6px' }}>
                                                                        {getFieldLabel(mod.field)} 수정
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                                                        <span style={{ textDecoration: 'line-through', opacity: 0.6, color: 'var(--text-secondary)' }}>
                                                                            {mod.beforeValue || '(없음)'}
                                                                        </span>
                                                                        <ArrowRight size={12} style={{ color: 'var(--accent-violet)' }} />
                                                                        <strong style={{ color: 'var(--text-primary)' }}>
                                                                            {mod.afterValue || '(없음)'}
                                                                        </strong>
                                                                    </div>
                                                                    {mod.reason && (
                                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                                                                            사유: {mod.reason}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {log.answer && (
                                                                <div className="timeline-detail-box answer">
                                                                    {log.answer}
                                                                </div>
                                                            )}
                                                            {log.memo && (
                                                                <div className="timeline-detail-box memo">
                                                                    {log.memo}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Confirmation / Action Modals */}
            {modal.isOpen && createPortal(
                <div
                    className="modal-overlay"
                    onClick={(e) => {
                        e.stopPropagation();
                        setModal({ ...modal, isOpen: false });
                    }}
                >
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {modal.type === 'STATUS_CHANGE' ? '티켓 상태 변경' :
                                    modal.type === 'EDIT_FIELDS' ? '문의 정보 수정' : '업무 답변 및 메모 등록'}
                            </h3>
                            <button
                                type="button"
                                className="close-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setModal({ ...modal, isOpen: false });
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {modal.type === 'STATUS_CHANGE' ? (
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                티켓 상태를 <strong>[{getStatusKorean(modal.targetStatus || '')}]</strong> 상태로 변경하시겠습니까?
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    작성하신 공식 답변과 내부 메모를 등록하시겠습니까?
                                </p>
                                <div className="form-group">
                                    <label htmlFor="status-select-modal">등록과 동시에 티켓 상태를 변경하시겠습니까?</label>
                                    <select
                                        id="status-select-modal"
                                        className="select-input"
                                        value={modal.selectedStatus}
                                        onChange={(e) => setModal({ ...modal, selectedStatus: e.target.value })}
                                    >
                                        <option value={inquiry.status}>상태 유지 (현재: {getStatusKorean(inquiry.status)})</option>
                                        {inquiry.status !== 'OPEN' && <option value="OPEN">미처리 (OPEN) 상태로 변경</option>}
                                        {inquiry.status !== 'IN_PROGRESS' && <option value="IN_PROGRESS">진행중 (IN_PROGRESS) 상태로 변경</option>}
                                        {inquiry.status !== 'RESOLVED' && <option value="RESOLVED">완료 (RESOLVED) 상태로 변경</option>}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setModal({ ...modal, isOpen: false })}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                disabled={submittingLog || statusChanging}
                                onClick={() => {
                                    if (modal.type === 'STATUS_CHANGE') {
                                        executeStatusChange();
                                    } else {
                                        executeRegisterWorkLog();
                                    }
                                }}
                            >
                                {submittingLog || statusChanging ? '처리 중...' :
                                    (modal.type === 'STATUS_CHANGE' ? '확인' : '등록')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
