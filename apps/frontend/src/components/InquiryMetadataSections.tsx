import { Cpu, Info, Loader2, RefreshCw } from 'lucide-react';
import type { ChannelMetadata, CustomerInquiry, DeviceInfo } from '../types/inquiry';
import type { InquiryFieldEditor } from '../hooks/useInquiryFieldEditor';

interface MetadataSectionProps {
  inquiry: CustomerInquiry;
  editor: InquiryFieldEditor;
  refreshing: boolean;
  onRefresh: () => void;
}

interface DeviceSectionProps {
  device: DeviceInfo | null;
  editor: InquiryFieldEditor;
}

const displayChannel = (channel: string) => {
  const normalized = channel.toUpperCase();
  if (normalized.includes('NAVER_CAFE') || normalized.includes('CAFE')) return '네이버 카페';
  if (normalized.includes('EMAIL')) return '이메일';
  if (normalized.includes('GOOGLE_SHEET') || normalized.includes('SHEET')) return '구글 시트';
  if (normalized.includes('PHONE')) return '전화 접수';
  return channel;
};

const MetadataValue = ({ value }: { value: unknown }) => (
  <>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</>
);

function channelSpecificRows(inquiry: CustomerInquiry, metadata: ChannelMetadata | null) {
  if (!metadata) return [];
  const rows: React.ReactNode[] = [];
  const channel = inquiry.channel.toUpperCase();
  const isType = (type: string) => channel.includes(type) || metadata.metadataType === type;
  const addRow = (key: string, label: string, value: unknown, style?: React.CSSProperties) => {
    if (value === null || value === undefined || value === '') return;
    rows.push(<tr key={key}><th>{label}</th><td style={{ wordBreak: 'break-all', ...style }}><MetadataValue value={value} /></td></tr>);
  };

  if (isType('NAVER_CAFE')) {
    addRow('cafeId', '카페 ID', metadata.cafeId);
    addRow('articleId', '게시글 ID', metadata.articleId);
    if (metadata.menu) addRow('menu', '게시판', `${metadata.menu.name} (ID: ${metadata.menu.id})`);
    if (metadata.writer) addRow('writer', '작성자', `${metadata.writer.nickname} (${metadata.writer.id})`);
    if (metadata.metrics) addRow('metrics', '지표', `조회 ${metadata.metrics.readCount ?? 0} · 댓글 ${metadata.metrics.commentCount ?? 0} · 좋아요 ${metadata.metrics.likeCount ?? 0}`);
  } else if (isType('GOOGLE_SHEET')) {
    addRow('rowNumber', '행 번호', metadata.rowNumber ? `${metadata.rowNumber}번 행` : null);
    addRow('category', '카테고리', metadata.category);
    addRow('type', '문의 항목', metadata.type);
    addRow('contact', '연락처', metadata.contact);
    if (metadata.reply) addRow('reply', '답변 수신', `${metadata.reply.type}${metadata.reply.email ? ` (${metadata.reply.email})` : ''}`);
  } else if (isType('EMAIL')) {
    const messageId = metadata.headers?.['message-id'] || metadata.headers?.messageId;
    addRow('from', '보낸 사람', metadata.from);
    addRow('to', '받는 사람', metadata.to);
    addRow('subject', '제목', metadata.subject);
    addRow('messageId', '메시지 ID', messageId, { fontSize: '11px', fontFamily: 'monospace' });
    addRow('uid', 'IMAP UID', metadata.attributes?.uid);
    addRow('date', '작성 일시', metadata.date);
  } else if (isType('PHONE')) {
    addRow('phoneNumber', '전화번호', metadata.phoneNumber);
    addRow('memo', '상담 메모', metadata.memo, { whiteSpace: 'pre-wrap' });
  } else {
    Object.entries(metadata).forEach(([key, value]) => {
      if (['metadataType', 'imageUrls', 'articleUrl', 'customFields'].includes(key)) return;
      addRow(key, key, value);
    });
  }
  return rows;
}

export function InquiryChannelMetadataSection({ inquiry, editor, refreshing, onRefresh }: MetadataSectionProps) {
  const metadata = inquiry.channelMetadata;
  const channelChanged = editor.editChannel !== inquiry.channel;
  const userCodeChanged = editor.editUserCode.trim() !== (inquiry.userCode || '');
  const rows = channelSpecificRows(inquiry, metadata);
  const originalCustomFields = metadata?.customFields || {};
  const currentCustomFields = Object.fromEntries(editor.editCustomFields.map((field) => [field.key, field.value]));
  const customFieldsChanged = JSON.stringify(originalCustomFields) !== JSON.stringify(currentCustomFields);

  if (editor.isEditing) {
    rows.push(
      <tr key="customFields-edit">
        <th>임의 속성</th>
        <td>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {editor.editCustomFields.map((field) => (
              <div key={field.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary, #f8fafc)', padding: '4px 8px', borderRadius: '6px', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>{field.key}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '11.5px', wordBreak: 'break-all' }}>{field.value}</span>
                  <button type="button" onClick={() => editor.removeCustomField(field.key)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" placeholder="속성명" value={editor.newCustomFieldKey} onChange={(event) => editor.setNewCustomFieldKey(event.target.value)} className="text-input" style={{ flex: 1, fontSize: '11px', padding: '4px 8px', height: '26px' }} />
              <input type="text" placeholder="속성값" value={editor.newCustomFieldValue} onChange={(event) => editor.setNewCustomFieldValue(event.target.value)} className="text-input" style={{ flex: 1, fontSize: '11px', padding: '4px 8px', height: '26px' }} />
              <button type="button" onClick={editor.addCustomField} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', height: '26px' }}>추가</button>
            </div>
            {customFieldsChanged && (
              <input type="text" className="text-input" placeholder="임의 속성 수정 사유 (필수)" value={editor.reasons.customFields || ''} onChange={(event) => editor.setReasons({ ...editor.reasons, customFields: event.target.value })} style={{ fontSize: '11px', borderColor: 'var(--accent-indigo)', padding: '4px 8px', height: '24px' }} required />
            )}
          </div>
        </td>
      </tr>,
    );
  } else {
    Object.entries(originalCustomFields).forEach(([key, value]) => rows.push(
      <tr key={`custom_${key}`}><th>{key}</th><td style={{ wordBreak: 'break-all' }}>{String(value)}</td></tr>,
    ));
  }

  return (
    <div className="detail-section" style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
      <span className="detail-title"><Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />채널 메타데이터</span>
      <div className="detail-box" style={{ background: 'transparent', border: 'none', padding: 0, overflow: 'visible' }}>
        <table className="profile-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <th style={{ width: '35%' }}>접수 채널</th>
              <td>{editor.isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <select id="edit-channel" className="select-input" value={editor.editChannel} onChange={(event) => editor.setEditChannel(event.target.value)} style={{ padding: '4px 8px', fontSize: '12px', height: '28px', border: '1px solid var(--border-light)', borderRadius: '6px' }}>
                    <option value="EMAIL">이메일 (EMAIL)</option><option value="PHONE">전화 (PHONE)</option><option value="GOOGLE_SHEET">구글 시트 (GOOGLE_SHEET)</option><option value="NAVER_CAFE">네이버 카페 (NAVER_CAFE)</option>
                  </select>
                  {channelChanged && <input type="text" className="text-input" placeholder="채널 수정 사유 (필수)" value={editor.reasons.channel || ''} onChange={(event) => editor.setReasons({ ...editor.reasons, channel: event.target.value })} style={{ fontSize: '11px', borderColor: 'var(--accent-indigo)', padding: '4px 8px', height: '24px', marginTop: '2px' }} required />}
                </div>
              ) : <span>{displayChannel(inquiry.channel)} ({inquiry.channel})</span>}</td>
            </tr>
            <tr>
              <th>유저 코드</th>
              <td>{editor.isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="text" id="edit-usercode" className="text-input" value={editor.editUserCode} onChange={(event) => editor.setEditUserCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 12))} placeholder="유저 코드 입력" style={{ padding: '4px 8px', fontSize: '12px', height: '28px', flex: 1 }} />
                    <span style={{ fontSize: '11px', fontWeight: 500, color: editor.editUserCode.length === 12 ? 'var(--accent-indigo)' : 'var(--text-muted)' }}>({editor.editUserCode.length}/12)</span>
                  </div>
                  {userCodeChanged && <input type="text" className="text-input" placeholder="유저 코드 수정 사유 (필수)" value={editor.reasons.userCode || ''} onChange={(event) => editor.setReasons({ ...editor.reasons, userCode: event.target.value })} style={{ fontSize: '11px', borderColor: 'var(--accent-indigo)', padding: '4px 8px', height: '24px', marginTop: '2px' }} required />}
                </div>
              ) : <span>{inquiry.userCode || '(없음)'}</span>}</td>
            </tr>
            {rows}
          </tbody>
        </table>
        {metadata?.articleUrl && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center' }}>
            <a href={metadata.articleUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-flex', padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}>
              {inquiry.channel.toUpperCase() === 'EMAIL' ? '이메일 바로가기 (새 창)' : '원문 게시글 바로가기 (새 창)'}
            </a>
            {inquiry.channel.toUpperCase() === 'NAVER_CAFE' && (
              <button type="button" onClick={onRefresh} disabled={refreshing} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', borderRadius: '8px', marginLeft: '8px', cursor: refreshing ? 'not-allowed' : 'pointer' }}>
                {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}데이터 갱신
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function InquiryDeviceInfoSection({ device, editor }: DeviceSectionProps) {
  const changed = editor.editAppVersion.trim() !== (device?.appVersion || '') || editor.editModel.trim() !== (device?.model || '') || editor.editOsVersion.trim() !== (device?.osVersion || '');
  if (!device && !editor.isEditing) return <div style={{ color: 'var(--text-muted)' }}>디바이스 정보 없음</div>;
  const fields = [
    { key: 'appVersion', label: '앱 버전', value: editor.editAppVersion, set: editor.setEditAppVersion, placeholder: '예: 1.0.0', original: device?.appVersion },
    { key: 'model', label: '기기 모델', value: editor.editModel, set: editor.setEditModel, placeholder: '예: iPhone 15', original: device?.model },
    { key: 'osVersion', label: 'OS 버전', value: editor.editOsVersion, set: editor.setEditOsVersion, placeholder: '예: 17.2', original: device?.osVersion },
  ];
  return (
    <div className="detail-section" style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
      <span className="detail-title"><Cpu size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />디바이스 정보</span>
      <div className="detail-box" style={{ background: 'transparent', border: 'none', padding: 0, overflow: 'visible' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <table className="profile-table" style={{ width: '100%', tableLayout: 'fixed' }}><tbody>
            {fields.map((field) => <tr key={field.key}><th style={field.key === 'appVersion' ? { width: '35%' } : undefined}>{field.label}</th><td>{editor.isEditing ? <input type="text" className="text-input" value={field.value} onChange={(event) => field.set(event.target.value)} placeholder={field.placeholder} style={{ padding: '4px 8px', fontSize: '12px', height: '28px' }} /> : <span>{field.original || '(값 없음)'}</span>}</td></tr>)}
            {device && Object.entries(device).filter(([key]) => !['appVersion', 'model', 'osVersion'].includes(key)).map(([key, value]) => <tr key={key}><th style={{ textTransform: 'capitalize' }}>{key}</th><td style={{ wordBreak: 'break-all' }}><MetadataValue value={value} /></td></tr>)}
          </tbody></table>
          {editor.isEditing && changed && <input type="text" className="text-input" placeholder="디바이스 정보 수정 사유 (필수)" value={editor.reasons.deviceInfo || ''} onChange={(event) => editor.setReasons({ ...editor.reasons, deviceInfo: event.target.value })} style={{ fontSize: '11px', borderColor: 'var(--accent-indigo)', padding: '4px 8px', height: '28px' }} required />}
        </div>
      </div>
    </div>
  );
}
