import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { parseVal, formatCurrencyInput } from '../../utils/formatters';

interface NewStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, saldoInicial: number) => void;
  error?: string;
}

const NewStoreModal: React.FC<NewStoreModalProps> = ({ isOpen, onClose, onSave, error }) => {
  const [name, setName] = useState('');
  const [saldo, setSaldo] = useState('');
  const formId = "new-store-form";
  
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSaldo('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name, parseVal(saldo));
  };

  const title = (
    <div className="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <span>Nova Loja</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:opacity-80">Cancelar</button>
          <button type="submit" form={formId} className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90">Salvar</button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="storeName" className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">
            Nome da Loja
          </label>
          <input
            id="storeName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-light-primary dark:focus:ring-dark-primary focus:border-light-primary dark:focus:border-dark-primary sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="initialBalance" className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">
            Saldo Inicial
          </label>
          <input
            id="initialBalance"
            type="text"
            value={saldo}
            onChange={(e) => setSaldo(formatCurrencyInput(e.target.value))}
            placeholder="0,00"
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-light-primary dark:focus:ring-dark-primary focus:border-light-primary dark:focus:border-dark-primary sm:text-sm text-right"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  );
};

export default NewStoreModal;