import { useEffect, useRef, useState } from 'react';
import { inquiryApi } from '../api/inquiryApi';
import type { CustomerInquiry, OperatorInfo } from '../types/inquiry';

type UpdateInquiryFieldsRequest = Parameters<typeof inquiryApi.updateInquiryFields>[1];
type InquiryFieldChanges = Omit<Partial<UpdateInquiryFieldsRequest>, 'operatorInfo' | 'reasons'>;

export interface InquiryEditReasons {
  channel?: string;
  userCode?: string;
  deviceInfo?: string;
  content?: string;
  customFields?: string;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface UseInquiryFieldEditorOptions {
  inquiry: CustomerInquiry;
  operator: OperatorInfo;
  onUpdateInquiry?: (id: string, updatedFields: Partial<CustomerInquiry>) => void;
  onSaved: () => Promise<void>;
  onClearActiveImage: () => void;
}

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : String(error)
);

export function useInquiryFieldEditor({
  inquiry,
  operator,
  onUpdateInquiry,
  onSaved,
  onClearActiveImage,
}: UseInquiryFieldEditorOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [editChannel, setEditChannel] = useState(inquiry.channel);
  const [editUserCode, setEditUserCode] = useState(inquiry.userCode || '');
  const [editContent, setEditContent] = useState(inquiry.content);
  const [editAppVersion, setEditAppVersion] = useState(inquiry.deviceInfo?.appVersion || '');
  const [editModel, setEditModel] = useState(inquiry.deviceInfo?.model || '');
  const [editOsVersion, setEditOsVersion] = useState(inquiry.deviceInfo?.osVersion || '');
  const [editError, setEditError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<InquiryEditReasons>({});
  const [editCustomFields, setEditCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [newCustomFieldKey, setNewCustomFieldKey] = useState('');
  const [newCustomFieldValue, setNewCustomFieldValue] = useState('');
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<PendingImage[]>([]);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing || !contentTextareaRef.current) return;
    const textarea = contentTextareaRef.current;
    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(180, textarea.scrollHeight + 4)}px`;
    };
    adjustHeight();
    const timer = setTimeout(adjustHeight, 50);
    return () => clearTimeout(timer);
  }, [isEditing, editContent]);

  useEffect(() => {
    pendingImagesRef.current = newImageFiles;
  }, [newImageFiles]);

  useEffect(() => () => {
    pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const startEditing = () => {
    onClearActiveImage();
    setEditChannel(inquiry.channel);
    setEditUserCode(inquiry.userCode || '');
    setEditContent(inquiry.content);
    setEditAppVersion(inquiry.deviceInfo?.appVersion || '');
    setEditModel(inquiry.deviceInfo?.model || '');
    setEditOsVersion(inquiry.deviceInfo?.osVersion || '');
    setReasons({});
    setEditError(null);
    setEditImageUrls(inquiry.imageUrls || []);
    setNewImageFiles([]);
    const customFields = inquiry.channelMetadata?.customFields || {};
    setEditCustomFields(Object.entries(customFields).map(([key, value]) => ({ key, value: String(value) })));
    setNewCustomFieldKey('');
    setNewCustomFieldValue('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError(null);
    setReasons({});
    newImageFiles.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setNewImageFiles([]);
  };

  const addCustomField = () => {
    const key = newCustomFieldKey.trim();
    const value = newCustomFieldValue.trim();
    if (!key || !value) {
      setEditError('속성명과 속성값을 모두 입력해 주세요.');
      return;
    }
    if (editCustomFields.some((field) => field.key.toLowerCase() === key.toLowerCase())) {
      setEditError('이미 존재하는 속성명입니다.');
      return;
    }
    setEditCustomFields((current) => [...current, { key, value }]);
    setNewCustomFieldKey('');
    setNewCustomFieldValue('');
    setEditError(null);
  };

  const removeCustomField = (key: string) => {
    setEditCustomFields((current) => current.filter((field) => field.key !== key));
  };

  const addImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;
    const files = Array.from(event.target.files);

    if (editImageUrls.length + newImageFiles.length + files.length > 10) {
      setEditError('이미지는 최대 10개까지 첨부할 수 있습니다.');
      return;
    }

    const validFiles = files.filter((file) => {
      if (!allowed.includes(file.type)) {
        setEditError(`지원하지 않는 파일 형식입니다: ${file.name}`);
        return false;
      }
      if (file.size > maxSize) {
        setEditError(`파일 크기가 10MB를 초과합니다: ${file.name}`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    setNewImageFiles((current) => [
      ...current,
      ...validFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    setEditError(null);
  };

  const removeExistingImage = (url: string) => {
    setEditImageUrls((current) => current.filter((item) => item !== url));
  };

  const removeNewImage = (id: string) => {
    setNewImageFiles((current) => {
      const image = current.find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const saveFields = async () => {
    const changes: InquiryFieldChanges = {};
    const requestReasons: UpdateInquiryFieldsRequest['reasons'] = {};
    let hasChanges = false;

    if (editChannel !== inquiry.channel) {
      if (!reasons.channel?.trim()) {
        setEditError('채널 수정 사유를 입력해주세요.');
        return;
      }
      changes.channel = editChannel;
      requestReasons.channel = reasons.channel.trim();
      hasChanges = true;
    }

    const userCode = editUserCode.trim();
    if (userCode !== (inquiry.userCode || '')) {
      if (userCode && !/^[0-9]{12}$/.test(userCode)) {
        setEditError('유저 코드는 숫자 12자리여야 합니다.');
        return;
      }
      if (!reasons.userCode?.trim()) {
        setEditError('유저 코드 수정 사유를 입력해주세요.');
        return;
      }
      changes.userCode = userCode || null;
      requestReasons.userCode = reasons.userCode.trim();
      hasChanges = true;
    }

    if (editContent !== inquiry.content) {
      if (!reasons.content?.trim()) {
        setEditError('문의 내용 수정 사유를 입력해주세요.');
        return;
      }
      changes.content = editContent;
      requestReasons.content = reasons.content.trim();
      hasChanges = true;
    }

    const nextDeviceInfo = {
      appVersion: editAppVersion.trim() || undefined,
      model: editModel.trim() || undefined,
      osVersion: editOsVersion.trim() || undefined,
    };
    const deviceChanged = editAppVersion.trim() !== (inquiry.deviceInfo?.appVersion || '')
      || editModel.trim() !== (inquiry.deviceInfo?.model || '')
      || editOsVersion.trim() !== (inquiry.deviceInfo?.osVersion || '');
    if (deviceChanged) {
      if (!reasons.deviceInfo?.trim()) {
        setEditError('디바이스 정보 수정 사유를 입력해주세요.');
        return;
      }
      changes.deviceInfo = nextDeviceInfo;
      requestReasons.deviceInfo = reasons.deviceInfo.trim();
      hasChanges = true;
    }

    const originalCustomFields = inquiry.channelMetadata?.customFields || {};
    const nextCustomFields = Object.fromEntries(editCustomFields.map((field) => [field.key, field.value]));
    const customFieldsChanged = JSON.stringify(originalCustomFields) !== JSON.stringify(nextCustomFields);
    if (customFieldsChanged) {
      if (!reasons.customFields?.trim()) {
        setEditError('임의 속성 수정 사유를 입력해주세요.');
        return;
      }
      changes.customFields = nextCustomFields;
      requestReasons.customFields = reasons.customFields.trim();
      hasChanges = true;
    }

    const removedImages = (inquiry.imageUrls || []).filter((url) => !editImageUrls.includes(url));
    const imagesChanged = removedImages.length > 0 || newImageFiles.length > 0;
    if (!hasChanges && !imagesChanged) {
      setIsEditing(false);
      return;
    }

    setSavingFields(true);
    setEditError(null);
    try {
      const finalImageUrls = [...editImageUrls];
      if (newImageFiles.length > 0) {
        const timestamp = Date.now();
        const requests = newImageFiles.map((image, index) => ({
          objectName: `inquiries/${inquiry.id}/${timestamp}_${index}_${image.file.name.replace(/\s+/g, '_')}`,
          contentType: image.file.type || 'image/jpeg',
        }));
        const presignedUrls = await inquiryApi.getPresignedUrls(requests);
        for (let index = 0; index < newImageFiles.length; index += 1) {
          await inquiryApi.uploadToMinIO(presignedUrls[index].uploadUrl, newImageFiles[index].file);
          finalImageUrls.push(presignedUrls[index].downloadUrl);
        }
      }

      await inquiryApi.updateInquiryFields(inquiry.id, {
        operatorInfo: operator,
        ...changes,
        imageUrls: imagesChanged ? finalImageUrls : undefined,
        reasons: requestReasons,
      });

      newImageFiles.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setNewImageFiles([]);
      onUpdateInquiry?.(inquiry.id, {
        channel: editChannel,
        userCode: userCode || null,
        content: editContent,
        imageUrls: finalImageUrls,
        deviceInfo: deviceChanged ? nextDeviceInfo : inquiry.deviceInfo,
        channelMetadata: customFieldsChanged
          ? { ...(inquiry.channelMetadata || {}), customFields: nextCustomFields }
          : inquiry.channelMetadata,
      });
      await onSaved();
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setEditError('수정 중 오류가 발생했습니다: ' + getErrorMessage(error));
    } finally {
      setSavingFields(false);
    }
  };

  return {
    isEditing,
    savingFields,
    editChannel,
    setEditChannel,
    editUserCode,
    setEditUserCode,
    editContent,
    setEditContent,
    editAppVersion,
    setEditAppVersion,
    editModel,
    setEditModel,
    editOsVersion,
    setEditOsVersion,
    editError,
    reasons,
    setReasons,
    editCustomFields,
    newCustomFieldKey,
    setNewCustomFieldKey,
    newCustomFieldValue,
    setNewCustomFieldValue,
    editImageUrls,
    newImageFiles,
    imageInputRef,
    contentTextareaRef,
    gutterRef,
    startEditing,
    cancelEditing,
    addCustomField,
    removeCustomField,
    addImages,
    removeExistingImage,
    removeNewImage,
    saveFields,
  };
}

export type InquiryFieldEditor = ReturnType<typeof useInquiryFieldEditor>;
