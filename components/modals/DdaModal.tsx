
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import ConfirmationModal from '../ui/ConfirmationModal';
import { DDA, PaymentRule } from '../../types';
import { toBRL, parseVal, formatCurrencyInput, toBRLInput } from '../../utils/formatters';

interface DdaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojaNome: string;
  ddaList: DDA[];
  lojasNomes: string[];
  paymentRules: PaymentRule[];
  onUpdateDdaList: (newDdaList: DDA[]) => void;
  onTransferItem: (index: number, destinationStore: string) => void;
}

const DdaModal: React.FC<DdaModalProps> = ({ isOpen, onClose, lojaNome, ddaList, lojasNomes, paymentRules, onUpdateDdaList, onTransferItem }) => {
  const [editingDda, setEditingDda] = useState<(DDA & { index: number }) | null>(null);
  const [transferringDda, setTransferringDda] = useState<(DDA & { index: number }) | null>(null);
  const [destinationStore, setDestinationStore] = useState('');
  
  const [formBenef, setFormBenef] = useState('');
  const [formDoc, setFormDoc] = useState('');
  const [formVenc, setFormVenc] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formStatus, setFormStatus] = useState<'aberto' | 'pago'>('aberto');
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string; confirmVariant?: 'primary' | 'danger' }>({ isOpen: false, onConfirm: () => {}, title: '', message: '', confirmVariant: 'primary' });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen) {
        setEditingDda(null);
        setTransferringDda(null);
        setDestinationStore('');
        setSelectedIndices(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingDda) {
        setFormBenef(editingDda.benef);
        setFormDoc(editingDda.doc);
        setFormVenc(editingDda.venc);
        setFormValor(toBRLInput(editingDda.valor));
        setFormStatus(editingDda.status || 'aberto');
    }
  }, [editingDda]);

  useEffect(() => {
    if (transferringDda) {
      const otherStores = lojasNomes.filter(name => name !== lojaNome);
      setDestinationStore(otherStores[0] || '');
    }
  }, [transferringDda, lojasNomes, lojaNome]);

  const handleDeleteRequest = (index: number) => {
    setConfirmState({
      isOpen: true,
      onConfirm: () => {
        onUpdateDdaList(ddaList.filter((_, i) => i !== index));
        setConfirmState({ ...confirmState, isOpen: false });
      },
      title: 'Excluir Lançamento',
      message: 'Tem certeza que deseja excluir este lançamento DDA?',
      confirmVariant: 'danger'
    });
  };
  
  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingDda) return;

      const updatedList = [...ddaList];
      updatedList[editingDda.index] = {
          benef: formBenef,
          doc: formDoc,
          venc: formVenc,
          valor: parseVal(formValor),
          status: formStatus
      };
      onUpdateDdaList(updatedList);
      setEditingDda(null);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringDda || !destinationStore) return;
    onTransferItem(transferringDda.index, destinationStore);
    setTransferringDda(null);
  };
  
  const handleScheduleSelectedRequest = () => {
    // Explicitly typed (i: number) to avoid "unknown" index errors
    const abertos = Array.from(selectedIndices).filter((i: number) => (ddaList[i].status ?? 'aberto') === 'aberto');
    if (abertos.length === 0) return;
    
    setConfirmState({
        isOpen: true,
        onConfirm: () => {
            const updatedList = ddaList.map((dda, i) => 
                selectedIndices.has(i) ? { ...dda, status: 'pago' as const } : dda
            );
            onUpdateDdaList(updatedList);
            setSelectedIndices(new Set());
            setConfirmState({ ...confirmState, isOpen: false });
        },
        title: `Agendar ${abertos.length} Iten(s)`,
        message: 'Tem certeza que deseja agendar os lançamentos DDA selecionados?',
        confirmVariant: 'primary'
    });
  };

  const handleReopenSelectedRequest = () => {
    // Explicitly typed (i: number) to avoid "unknown" index errors
    const pagos = Array.from(selectedIndices).filter((i: number) => (ddaList[i].status ?? 'aberto') === 'pago');
    if (pagos.length === 0) return;

    setConfirmState({
        isOpen: true,
        onConfirm: () => {
            const updatedList = ddaList.map((dda, i) => 
                selectedIndices.has(i) ? { ...dda, status: 'aberto' as const } : dda
            );
            onUpdateDdaList(updatedList);
            setSelectedIndices(new Set());
            setConfirmState({ ...confirmState, isOpen: false });
        },
        title: `Reabrir ${pagos.length} Iten(s)`,
        message: 'Deseja voltar os lançamentos selecionados para o status "Em Aberto"?',
        confirmVariant: 'primary'
    });
  };

  const handleDeleteSelectedRequest = () => {
    if (selectedIndices.size === 0) return;
    setConfirmState({
        isOpen: true,
        onConfirm: () => {
            const updatedList = ddaList.filter((_, i) => !selectedIndices.has(i));
            onUpdateDdaList(updatedList);
            setSelectedIndices(new Set());
            setConfirmState({ ...confirmState, isOpen: false });
        },
        title: `Excluir ${selectedIndices.size} Iten(s)`,
        message: 'Tem certeza que deseja excluir permanentemente os lançamentos DDA selecionados?',
        confirmVariant: 'danger'
    });
  };
  
  const handleSelect = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  const { allRowsSelected, totalIndicesCount } = useMemo(() => {
    const allSelected = ddaList.length > 0 && ddaList.every((_, i) => selectedIndices.has(i));
    return { allRowsSelected: allSelected, totalIndicesCount: ddaList.length };
  }, [ddaList, selectedIndices]);

  const handleSelectAll = () => {
    if (allRowsSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(ddaList.map((_, i) => i)));
    }
  };
  
  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const [day, month, year] = parts.map(Number);
    const dueDate = new Date(year, month - 1, day);
    dueDate.setHours(23, 59, 59, 999);
    const today = new Date();
    return dueDate < today;
  };
  
  const getRuleMatch = (dda: DDA): { message: string, isRecurring?: boolean } | null => {
      if (!paymentRules || paymentRules.length === 0) return null;
      const normalize = (str: string) => str.replace(/\D/g, '');
      const parseDdaDateToYmd = (dateStr: string): string => {
        if (!dateStr) return '';
        const parts = dateStr.split('/');
        if (parts.length !== 3) return '';
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };

      const rule = paymentRules.find(r => {
          let match = true;
          if (r.term) {
             const text = (dda.benef + ' ' + dda.doc).toLowerCase();
             if (!text.includes(r.term.toLowerCase())) match = false;
          }
          if (match && r.matchDoc) {
              const ddaDocClean = normalize(dda.doc);
              const ruleDocClean = normalize(r.matchDoc);
              if (ruleDocClean.length > 4) {
                 if (!ddaDocClean.includes(ruleDocClean)) match = false;
              } else if (!dda.doc.includes(r.matchDoc)) match = false;
          }
          if (match && r.matchValue !== undefined && Math.abs(r.matchValue - dda.valor) > 0.01) match = false;
          if (match && r.matchDate && r.matchDate !== parseDdaDateToYmd(dda.venc)) match = false;
          return match;
      });

      return rule ? { message: rule.alertMessage, isRecurring: rule.isRecurring } : null;
  };

  const totalDDA = ddaList.reduce((acc, d) => acc + d.valor, 0);
  const totalDDAAberto = ddaList.reduce((acc, d) => (d.status ?? 'aberto') !== 'pago' ? acc + d.valor : acc, 0);
  const totalDDASelected = ddaList.reduce((acc, d, i) => selectedIndices.has(i) ? acc + d.valor : acc, 0);

  // Checks if any selected item is currently "paid" to show the "Voltar para Aberto" button
  // Explicitly typed (i: number) to avoid "unknown" index errors
  const hasPaidInSelection = Array.from(selectedIndices).some((i: number) => ddaList[i]?.status === 'pago');
  const hasOpenInSelection = Array.from(selectedIndices).some((i: number) => (ddaList[i]?.status ?? 'aberto') === 'aberto');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lançamentos DDA - ${lojaNome}`} size="6xl">
      <div className="max-h-[60vh] flex flex-col">
        {editingDda ? (
            <form onSubmit={handleSaveEdit} className="space-y-4 p-4 bg-light-bg dark:bg-dark-bg rounded-lg">
                <h3 className="font-bold text-lg border-b border-light-border dark:border-dark-border pb-2">Editando Lançamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="text-sm font-medium">Beneficiário</label>
                      <input type="text" value={formBenef} onChange={e => setFormBenef(e.target.value)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none"/>
                  </div>
                  <div>
                      <label className="text-sm font-medium">Documento</label>
                      <input type="text" value={formDoc} onChange={e => setFormDoc(e.target.value)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none"/>
                  </div>
                  <div>
                      <label className="text-sm font-medium">Vencimento (DD/MM/AAAA)</label>
                      <input type="text" value={formVenc} onChange={e => setFormVenc(e.target.value)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none"/>
                  </div>
                  <div>
                      <label className="text-sm font-medium">Valor</label>
                      <input type="text" value={formValor} onChange={e => setFormValor(formatCurrencyInput(e.target.value))} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border text-right focus:ring-2 focus:ring-light-primary font-mono outline-none"/>
                  </div>
                  <div>
                      <label className="text-sm font-medium">Situação</label>
                      <select value={formStatus} onChange={e => setFormStatus(e.target.value as any)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none">
                          <option value="aberto">Em Aberto</option>
                          <option value="pago">Agendado</option>
                      </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-light-border dark:border-dark-border">
                    <button type="button" onClick={() => setEditingDda(null)} className="px-4 py-2 text-sm rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:opacity-80">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 shadow-md">Salvar</button>
                </div>
            </form>
        ) : transferringDda ? (
          <form onSubmit={handleTransferSubmit} className="space-y-4 p-6 bg-light-bg dark:bg-dark-bg rounded-xl border border-light-border dark:border-dark-border shadow-inner">
             <div className="flex items-center gap-3 mb-2 text-light-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                <h3 className="font-bold text-lg">Transferir DDA para outra Loja</h3>
             </div>
             <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-light-border dark:border-dark-border">
                <p className="text-sm">Beneficiário: <span className="font-bold">{transferringDda.benef}</span></p>
                <p className="text-sm">Documento: <span className="font-mono text-xs">{transferringDda.doc}</span></p>
                <p className="text-sm">Valor: <span className="font-bold text-light-danger">{toBRL(transferringDda.valor)}</span></p>
                <p className="text-xs text-light-subtle mt-1">Vencimento: {transferringDda.venc}</p>
             </div>
             <div>
                <label className="block text-sm font-medium mb-1">Loja de Destino</label>
                <select value={destinationStore} onChange={e => setDestinationStore(e.target.value)} className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none" required>
                  {lojasNomes.filter(name => name !== lojaNome).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
             </div>
             <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setTransferringDda(null)} className="px-5 py-2 text-sm rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:opacity-80">Cancelar</button>
                <button type="submit" disabled={!destinationStore} className="px-5 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90">Confirmar Transferência</button>
             </div>
          </form>
        ) : (
          <>
            <div className="flex justify-end items-center mb-4 px-1 gap-2 min-h-[44px]">
                {selectedIndices.size > 0 && (
                  <div className="flex items-center gap-2 bg-light-primary/5 dark:bg-dark-primary/10 p-2 rounded-xl border border-light-primary/20 animate-fade-in-scale">
                    <button onClick={handleDeleteSelectedRequest} className="px-3 py-1.5 text-xs rounded-lg font-semibold text-white bg-light-danger dark:bg-dark-danger hover:opacity-90 transition shadow-sm">Excluir ({selectedIndices.size})</button>
                    
                    {hasOpenInSelection && (
                        <button onClick={handleScheduleSelectedRequest} className="px-3 py-1.5 text-xs rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 transition shadow-sm">Agendar</button>
                    )}

                    {hasPaidInSelection && (
                        <button onClick={handleReopenSelectedRequest} className="px-3 py-1.5 text-xs rounded-lg font-semibold text-white bg-light-warning dark:bg-dark-warning hover:opacity-90 transition shadow-sm">Voltar para Aberto</button>
                    )}
                  </div>
                )}
            </div>
            <div className="overflow-y-auto flex-grow border border-light-border dark:border-dark-border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase bg-light-bg dark:bg-dark-bg text-light-subtle dark:text-dark-subtle sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2">
                      <input type="checkbox" checked={allRowsSelected} onChange={handleSelectAll} disabled={totalIndicesCount === 0} className="rounded" />
                    </th>
                    <th className="px-4 py-2">Beneficiário</th>
                    <th className="px-4 py-2">Doc.</th>
                    <th className="px-4 py-2">Vencimento</th>
                    <th className="px-4 py-2">Situação</th>
                    <th className="px-4 py-2 text-right">Valor</th>
                    <th className="px-4 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ddaList.length > 0 ? ddaList.map((d, i) => {
                    const isItemSelected = selectedIndices.has(i);
                    const isItemOverdue = (d.status ?? 'aberto') === 'aberto' && isOverdue(d.venc);
                    const ruleAlert = getRuleMatch(d);
                    
                    return (
                    <tr key={i} className={`border-b border-light-border dark:border-dark-border hover:bg-light-bg/30 ${isItemSelected ? 'bg-light-primary/5' : ''} ${ruleAlert ? 'bg-yellow-500/5' : ''}`}>
                      <td className="px-4 py-2">
                         <input type="checkbox" checked={isItemSelected} onChange={() => handleSelect(i)} className="rounded" />
                      </td>
                      <td className="px-4 py-3 font-bold text-light-heading dark:text-dark-heading">
                        {d.benef}
                        {ruleAlert && (
                            <div className="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold flex items-center gap-1 mt-0.5">
                                {ruleAlert.isRecurring ? <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}
                                {ruleAlert.message}
                            </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-light-subtle dark:text-dark-subtle text-[11px]">{d.doc}</td>
                      <td className={`px-4 py-3 text-[11px] whitespace-nowrap ${isItemOverdue ? 'font-black text-light-danger' : ''}`}>{d.venc}</td>
                      <td className="px-4 py-3">
                         <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${ d.status === 'pago' ? 'bg-light-accent/10 text-light-accent' : 'bg-light-warning/10 text-light-warning' }`}>
                          {d.status === 'pago' ? 'Agendado' : 'Em Aberto'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${isItemOverdue ? 'text-light-danger' : 'text-light-heading dark:text-dark-heading'}`}>{toBRL(d.valor)}</td>
                      <td className="px-4 py-3 text-center">
                         <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setEditingDda({ ...d, index: i })} className="p-1 text-light-subtle hover:text-light-primary transition-colors" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                            <button onClick={() => setTransferringDda({ ...d, index: i })} className="p-1 text-light-subtle hover:text-light-accent transition-colors" title="Transferir"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></button>
                            <button onClick={() => handleDeleteRequest(i)} className="p-1 text-light-subtle hover:text-light-danger transition-colors" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                      </td>
                    </tr>
                  )}) : (
                    <tr><td colSpan={7} className="text-center py-16 text-light-subtle">Nenhum lançamento DDA para esta loja.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
        </>
        )}
      </div>
      <div className="mt-4 p-4 rounded-xl bg-light-bg dark:bg-dark-bg text-sm flex justify-between shadow-inner">
          <div className="flex flex-col"><span className="text-[10px] font-bold uppercase text-light-subtle">Total DDA</span><span className="font-bold text-light-heading dark:text-dark-heading text-lg">{toBRL(totalDDA)}</span></div>
          <div className="flex flex-col text-right"><span className="text-[10px] font-bold uppercase text-light-warning">Pendente</span><span className="font-bold text-lg text-light-warning">{toBRL(totalDDAAberto)}</span></div>
          {selectedIndices.size > 0 && (
            <div className="flex flex-col text-right"><span className="text-[10px] font-bold uppercase text-light-primary">Selecionado</span><span className="font-bold text-lg text-light-primary">{toBRL(totalDDASelected)}</span></div>
          )}
      </div>
       <ConfirmationModal isOpen={confirmState.isOpen} onClose={() => setConfirmState({ ...confirmState, isOpen: false })} onConfirm={confirmState.onConfirm} title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmVariant === 'danger' ? 'Excluir' : 'Confirmar'} confirmVariant={confirmState.confirmVariant} />
    </Modal>
  );
};

export default DdaModal;
