import React from 'react';
import Modal from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
}) => {
  if (!isOpen) return null;

  const confirmButtonClass = confirmVariant === 'danger'
    ? 'bg-light-danger dark:bg-dark-danger hover:opacity-90'
    : 'bg-light-primary dark:bg-dark-primary hover:opacity-90';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:opacity-80">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm rounded-lg font-semibold text-white ${confirmButtonClass}`}>
            {confirmText}
          </button>
        </>
      }
    >
      <div className="text-light-subtle dark:text-dark-subtle">{message}</div>
    </Modal>
  );
};

export default ConfirmationModal;
