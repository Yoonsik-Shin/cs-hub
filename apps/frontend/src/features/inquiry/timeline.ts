import type {
  CustomerInquiry,
  FieldModification,
  InquiryStatus,
  InquiryWorkLog,
} from '../../types/inquiry';

export interface TimelineItem {
  id: string;
  actionType: InquiryWorkLog['actionType'];
  createdAt: string;
  operatorInfo: { id: string; nickname: string; email: string; role?: string };
  memo: string | null;
  answer: string | null;
  previousStatus: InquiryStatus | null;
  currentStatus: InquiryStatus | null;
  imageUrls?: string[] | null;
  ipAddress?: string | null;
  modificationDetails?: FieldModification[] | null;
}

export function buildInquiryTimeline(
  inquiry: CustomerInquiry,
  workLogs: readonly InquiryWorkLog[],
  replies: readonly CustomerInquiry[],
  channelLabel: string,
  now: string = new Date().toISOString(),
): TimelineItem[] {
  const initialSubmission: TimelineItem = {
    id: 'initial_submission',
    actionType: 'INITIAL_SUBMISSION',
    createdAt: inquiry.timestamp,
    operatorInfo: {
      id: 'customer',
      nickname: inquiry.userCode || '고객(익명)',
      email: '',
    },
    memo: `[${channelLabel}] 채널을 통해 문의가 정상적으로 접수되었습니다.`,
    answer: '',
    previousStatus: 'OPEN',
    currentStatus: 'OPEN',
  };

  const comments = inquiry.channel.toUpperCase() === 'NAVER_CAFE'
    ? inquiry.channelMetadata?.comments || []
    : [];
  const commentItems = comments.map((comment): TimelineItem => {
    const isOperatorReply = comment.isOperator === true;
    const writerNickname = comment.writer?.nickname || '네이버 카페 유저';
    return {
      id: `comment_${comment.commentId}`,
      actionType: isOperatorReply ? 'ANSWER_SUBMITTED' : 'CUSTOMER_REPLY',
      createdAt: comment.writeDate,
      operatorInfo: {
        id: isOperatorReply ? 'operator' : 'customer',
        nickname: isOperatorReply ? `CS 매니저 (${writerNickname})` : writerNickname,
        email: '',
      },
      memo: isOperatorReply ? '' : comment.content,
      answer: isOperatorReply ? comment.content : '',
      previousStatus: null,
      currentStatus: null,
      imageUrls: comment.imageUrls || [],
    };
  });

  const replyItems = replies.map((reply): TimelineItem => {
    const fromEmail = reply.channelMetadata?.from || '';
    const isNaverCafe = reply.channel.toUpperCase() === 'NAVER_CAFE';
    const isOperatorReply = isNaverCafe
      ? reply.channelMetadata?.isOperator === true
      : fromEmail.includes('runday@ttam.ai');
    return {
      id: reply.id,
      actionType: isOperatorReply ? 'ANSWER_SUBMITTED' : 'CUSTOMER_REPLY',
      createdAt: reply.timestamp,
      operatorInfo: {
        id: isOperatorReply ? 'operator' : 'customer',
        nickname: isOperatorReply
          ? (isNaverCafe ? `CS 매니저 (${reply.userCode || '네이버 카페'})` : 'CS 매니저')
          : (reply.userCode || '고객(익명)'),
        email: fromEmail,
      },
      memo: isOperatorReply ? '' : reply.content,
      answer: isOperatorReply ? reply.content : '',
      previousStatus: null,
      currentStatus: null,
      imageUrls: reply.imageUrls,
    };
  });

  const activityItems: TimelineItem[] = [...workLogs, ...replyItems, ...commentItems];
  activityItems.sort((left, right) => (
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  ));

  const timeline = [initialSubmission, ...activityItems];
  if (workLogs.length === 0 && replies.length === 0 && inquiry.status !== 'RESOLVED') {
    timeline.push({
      id: 'pending_action',
      actionType: 'PENDING_ACTION',
      createdAt: now,
      operatorInfo: { id: 'system', nickname: '배정 대기', email: '' },
      memo: '답변 등록 또는 비공개 메모 작성을 기다리고 있습니다.',
      answer: '',
      previousStatus: inquiry.status,
      currentStatus: inquiry.status,
    });
  }

  return timeline;
}
