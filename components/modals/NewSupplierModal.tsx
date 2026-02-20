import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Supplier } from '../../types';

interface NewSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Omit<Supplier, 'id'>) => void;
}

const NewSupplierModal: React.FC<NewSupplierModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [chavePix, setChavePix] = useState('');
  const formId = "new-supplier-form";

  useEffect(() => {
    if (isOpen) {
      setName('');
      setChavePix('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({ name: name.trim(), chavePix: chavePix.trim() });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Fornecedor"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:opacity-80">Cancelar</button>
          <button type="submit" form={formId} className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90">Salvar</button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Nome do Fornecedor</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
            className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Chave PIX (Opcional)</label>
          <input
            type="text"
            value={chavePix}
            onChange={e => setChavePix(e.target.value)}
            className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border"
          />
        </div>
      </form>
    </Modal>
  );
};

export default NewSupplierModal;
