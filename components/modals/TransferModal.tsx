import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Transferencia } from '../../types';
import { parseVal, formatCurrencyInput, toBRLInput } from '../../utils/formatters';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transfer: Transferencia, index?: number) => boolean;
  lojaOrigemNome: string;
  lojasNomes: string[];
  transfer: { item: Transferencia, index: number } | null;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onSave, lojaOrigemNome, lojasNomes, transfer }) => {
  const [origem, setOrigem] = useState(lojaOrigemNome);
  const [destino, setDestino] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [valor, setValor] = useState('');
  const [desc, setDesc] = useState('');
  const formId = "transfer-form";

  useEffect(() => {
    if (isOpen) {
      if (transfer) {
        setOrigem(transfer.item.origem);
        setDestino(transfer.item.destino);
        setData(transfer.item.data);
        setValor(toBRLInput(transfer.item.valor));
        setDesc(transfer.item.desc);
      } else {
        const otherLojas = lojasNomes.filter(n => n !== lojaOrigemNome);
        const initialDest = otherLojas[0] || '';
        setOrigem(lojaOrigemNome);
        setDestino(initialDest);
        setData(new Date().toISOString().split('T')[0]);
        setValor('');
        // Inicializa a descrição imediatamente para novos lançamentos
        if (lojaOrigemNome && initialDest) {
            setDesc(`Origem: ${lojaOrigemNome} / Destino: ${initialDest}`);
        } else {
            setDesc('');
        }
      }
    }
  }, [isOpen, transfer, lojaOrigemNome, lojasNomes]);

  // Mantém a descrição sincronizada para novos lançamentos quando origem ou destino mudam
  useEffect(() => {
    if (!transfer && origem && destino) {
      setDesc(`Origem: ${origem} / Destino: ${destino}`);
    }
  }, [origem, destino, transfer]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origem || !destino || origem === destino || parseVal(valor) <= 0) {
      return;
    }
    
    const newTransfer: Transferencia = {
      id: transfer?.item.id || Date.now(),
      origem,
      destino,
      data,
      valor: parseVal(valor),
      desc: desc.trim(),
      status: transfer?.item.status || 'aberto'
    };
    
    const success = onSave(newTransfer, transfer?.index);
    if (success) {
      onClose();
    }
  };
  
  const handleSwapStores = () => {
    const tempOrigem = origem;
    setOrigem(destino);
    setDestino(tempOrigem);
  };
  
  const isInvalid = !origem || !destino || origem === destino || parseVal(valor) <= 0;

  const title = (
    <div className="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      <span>{transfer ? "Editar Transferência" : "Nova Transferência"}</span>
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
          <button type="submit" form={formId} disabled={isInvalid} className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">Salvar</button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div>
              <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Origem</label>
              <select value={origem} onChange={e => setOrigem(e.target.value)} className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border">
                {lojasNomes.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div className="mt-6">
                 <button type="button" onClick={handleSwapStores} className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border transition-colors text-light-subtle dark:text-dark-subtle" title="Inverter origem e destino">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 12l-4-4m4 4l4-4m6 0v12m0-12l4 4m-4-4l-4 4" />
                    </svg>
                 </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Destino</label>
              <select value={destino} onChange={e => setDestino(e.target.value)} className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border">
                {lojasNomes.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
        </div>

        {origem === destino && origem && (
            <p className="text-sm text-center text-red-500 bg-red-500/10 p-2 rounded-md">A loja de origem não pode ser a mesma de destino.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} required className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Valor</label>
               <input 
                type="text" 
                value={valor}
                placeholder="0,00"
                onChange={(e) => setValor(formatCurrencyInput(e.target.value))} 
                required
                className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border text-right"
              />
            </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Descrição</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border"/>
        </div>
        
      </form>
    </Modal>
  );
};

export default TransferModal;