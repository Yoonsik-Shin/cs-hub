import { createPortal } from 'react-dom';
import type { OperatorInfo } from '../types/inquiry';
import type { CreateTicketInput } from './CreateTicketModal';
import { CreateTicketModal } from './CreateTicketModal';
import { AccountManagementModal } from './AccountManagementModal';
import type { BatchStatusModalState } from './BatchStatusModal';
import { BatchStatusModal } from './BatchStatusModal';
import { NaverLoginRenewPage } from './NaverLoginRenewPage';

interface DashboardModalsProps {
  createTicketOpen: boolean;
  accountManagementOpen: boolean;
  naverRenewOpen: boolean;
  operator: OperatorInfo | null;
  batchModal: BatchStatusModalState;
  selectedBatchCount: number;
  onCreateTicketClose: () => void;
  onCreateTicket: (input: CreateTicketInput) => Promise<void>;
  onAccountManagementClose: () => void;
  onNaverRenewClose: () => void;
  onBatchModalChange: (modal: BatchStatusModalState) => void;
  onBatchConfirm: () => void;
}

export function DashboardModals({
  createTicketOpen,
  accountManagementOpen,
  naverRenewOpen,
  operator,
  batchModal,
  selectedBatchCount,
  onCreateTicketClose,
  onCreateTicket,
  onAccountManagementClose,
  onNaverRenewClose,
  onBatchModalChange,
  onBatchConfirm,
}: DashboardModalsProps) {
  return (
    <>
      <CreateTicketModal isOpen={createTicketOpen} onClose={onCreateTicketClose} onSubmit={onCreateTicket} />
      {accountManagementOpen && <AccountManagementModal onClose={onAccountManagementClose} currentUsername={operator?.id || ''} />}
      <BatchStatusModal modal={batchModal} selectedCount={selectedBatchCount} onChange={onBatchModalChange} onConfirm={onBatchConfirm} />
      {naverRenewOpen && createPortal(<NaverLoginRenewPage isModal onClose={onNaverRenewClose} />, document.body)}
    </>
  );
}
