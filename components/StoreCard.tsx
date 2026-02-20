
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Loja, Group, Agendamento, Transferencia, DDA, Recebimento, Supplier, PaymentRule } from '../types';
import { toBRL, parseVal, formatCurrencyInput, toBRLInput } from '../utils/formatters';
import ScheduleModal from './modals/ScheduleModal';
import TransferModal from './modals/TransferModal';
import FolhaModal from './modals/FolhaModal';
import ConfirmationModal from './ui/ConfirmationModal';

interface StoreCardProps {
  nome: string;
  loja: Loja;
  system: Group;
  paymentRules: PaymentRule[];
  onUpdateLoja: (updatedLoja: Loja) => void;
  onOpenDdaModal: () => void;
  onImportDda: (file: File) => void;
  onImportSalary: (file: File) => void;
  onOpenCollaborators: () => void;
  onSystemUpdate: (newSystem: Group) => void;
  onDeleteStore: () => void;
}

const StoreCard: React.FC<StoreCardProps> = ({ nome, loja, system, paymentRules, onUpdateLoja, onOpenDdaModal, onImportDda, onImportSalary, onOpenCollaborators, onSystemUpdate, onDeleteStore }) => {
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<{item: Agendamento, index: number} | null>(null);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<{item: Transferencia, index: number} | null>(null);
  const [isFolhaModalOpen, setFolhaModalOpen] = useState(false);
  const [saldoDisplay, setSaldoDisplay] = useState(toBRLInput(loja.saldoInicial));
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    confirmVariant?: 'primary' | 'danger';
    actionType: 'clear' | null;
  }>({ 
    isOpen: false, 
    title: '', 
    message: '', 
    confirmVariant: 'danger',
    actionType: null
  });

  const ddaFileInputRef = useRef<HTMLInputElement>(null);
  const salaryFileInputRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSaldoDisplay(toBRLInput(loja.saldoInicial));
  }, [loja.saldoInicial]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
      if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
        setIsImportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDdaFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImportDda(file);
    if(event.target) event.target.value = '';
    setIsImportMenuOpen(false);
  };

  const handleSalaryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImportSalary(file);
    if(event.target) event.target.value = '';
    setIsImportMenuOpen(false);
  };
  
  const handleSaldoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaldoDisplay(formatCurrencyInput(e.target.value));
  };

  const handleSaldoInputBlur = () => {
      onUpdateLoja({ ...loja, saldoInicial: parseVal(saldoDisplay) });
  };
  
  const toggleStatus = (type: 'agend' | 'transf', index: number) => {
    const items = loja[type];
    const updatedItems = items.map((item, i) => {
        if (i === index) {
            return { ...item, status: item.status === 'pago' ? 'aberto' : 'pago' };
        }
        return item;
    });
    onUpdateLoja({ ...loja, [type]: updatedItems });
  };

  const handleSaveSchedule = (item: Agendamento | Agendamento[], index?: number) => {
      if (Array.isArray(item)) {
          const newAgend = [...loja.agend, ...item];
          onUpdateLoja({...loja, agend: newAgend});
          alert(`${item.length} lançamentos individuais realizados com sucesso!`);
      } else {
          const newAgend = [...loja.agend];
          if (index !== undefined) newAgend[index] = item; else newAgend.push(item);
          onUpdateLoja({...loja, agend: newAgend});
      }
      setEditingSchedule(null);
  };

  const handleDeleteSchedule = (index: number) => {
      const newAgend = loja.agend.filter((_, i) => i !== index);
      onUpdateLoja({...loja, agend: newAgend});
  };

  const handleSaveTransfer = (item: Transferencia, index?: number) => {
    const newSystem = JSON.parse(JSON.stringify(system));
    if (index !== undefined) {
      const transferId = item.id;
      for (const lName in newSystem.lojas) {
        newSystem.lojas[lName].transf = newSystem.lojas[lName].transf.filter((t: Transferencia) => t.id !== transferId);
        newSystem.lojas[lName].receb = newSystem.lojas[lName].receb.filter((r: Recebimento) => r.id !== transferId);
      }
    }
    const newId = index !== undefined ? item.id : Date.now();
    const newTransfer = { ...item, id: newId };
    if (newSystem.lojas[newTransfer.origem] && newSystem.lojas[newTransfer.destino]) {
      newSystem.lojas[newTransfer.origem].transf.push(newTransfer);
      newSystem.lojas[newTransfer.destino].receb.push({ id: newId, valor: newTransfer.valor });
    } else return false;
    onSystemUpdate(newSystem);
    setEditingTransfer(null);
    return true;
  };

  const handleDeleteTransfer = (index: number) => {
      const tToDelete = loja.transf[index];
      if (!tToDelete) return;
      const newSystem = JSON.parse(JSON.stringify(system));
      const { origem, destino, id } = tToDelete;
      if (newSystem.lojas[origem]) newSystem.lojas[origem].transf = newSystem.lojas[origem].transf.filter((t: any) => t.id !== id);
      if (newSystem.lojas[destino]) newSystem.lojas[destino].receb = newSystem.lojas[destino].receb.filter((r: any) => r.id !== id);
      onSystemUpdate(newSystem);
  };

  const handleTransferFolhaItem = (index: number, destinationStore: string) => {
    const newSystem = JSON.parse(JSON.stringify(system));
    const sourceStore = newSystem.lojas[nome];
    
    if (sourceStore && sourceStore.folha && sourceStore.folha[index]) {
      const itemToMove = sourceStore.folha[index];
      sourceStore.folha.splice(index, 1);
      if (newSystem.lojas[destinationStore]) {
        if (!newSystem.lojas[destinationStore].folha) newSystem.lojas[destinationStore].folha = [];
        newSystem.lojas[destinationStore].folha.push(itemToMove);
        onSystemUpdate(newSystem);
      }
    }
  };
  
  const handleClearEntries = () => {
    try {
      const newSystem = JSON.parse(JSON.stringify(system));
      const storeToClear = newSystem.lojas[nome];
      if (!storeToClear) return;
      if (!storeToClear.history) storeToClear.history = { dda: [], folha: [], agend: [], transf: [], receb: [] };
      storeToClear.transf.forEach((transfer: Transferencia) => {
        const destStore = newSystem.lojas[transfer.destino];
        if (destStore) {
          const receiptToArchive = destStore.receb.find((r: Recebimento) => r.id === transfer.id);
          if (receiptToArchive) {
            if (!destStore.history) destStore.history = { dda: [], folha: [], agend: [], transf: [], receb: [] };
            if (!destStore.history.receb) destStore.history.receb = [];
            destStore.history.receb.push(receiptToArchive);
            destStore.receb = destStore.receb.filter((r: Recebimento) => r.id !== transfer.id);
          }
        }
      });
      storeToClear.history.dda.push(...(storeToClear.dda || []));
      storeToClear.history.folha.push(...(storeToClear.folha || []));
      storeToClear.history.agend.push(...(storeToClear.agend || []));
      storeToClear.history.transf.push(...(storeToClear.transf || []));
      storeToClear.history.receb.push(...(storeToClear.receb || []));
      storeToClear.dda = []; storeToClear.folha = []; storeToClear.agend = []; storeToClear.transf = []; storeToClear.receb = [];
      onSystemUpdate(newSystem);
    } catch (error) { console.error(error); } finally { setConfirmState(prev => ({ ...prev, isOpen: false, actionType: null })); }
  };

  const handleClearEntriesRequest = () => {
    setIsActionsMenuOpen(false);
    setConfirmState({
      isOpen: true, actionType: 'clear',
      title: 'Limpar Lançamentos',
      message: `Tem certeza que deseja limpar todos os lançamentos da loja "${nome}"? Eles serão movidos para o histórico.`,
      confirmVariant: 'danger'
    });
  };

  const handleConfirmAction = () => { if (confirmState.actionType === 'clear') handleClearEntries(); };

  const filteredItems = useMemo(() => {
    const displayItems: any[] = [];
    if (loja.dda.length > 0) {
        const openDDA = loja.dda.filter(d => (d.status ?? 'aberto') === 'aberto');
        const totalValue = loja.dda.reduce((acc, d) => acc + d.valor, 0);
        let ddaStatusText = openDDA.length === 0 ? 'Agendado' : (openDDA.length === loja.dda.length ? 'Em Aberto' : 'Misto');
        displayItems.push({ type: 'dda-summary' as const, key: 'dda-summary', data: { count: loja.dda.length, openCount: openDDA.length, status: ddaStatusText, valor: totalValue } });
    }
    const folha = loja.folha || [];
    if (folha.length > 0) {
        const groups: Record<string, Agendamento[]> = {};
        folha.forEach(f => {
            const cat = f.categoriaFolha || 'SALÁRIO';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(f);
        });
        Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).forEach(([cat, items]) => {
            const openFolha = items.filter(f => f.status === 'aberto');
            const totalValue = items.reduce((acc, f) => acc + f.valor, 0);
            let statusText = openFolha.length === 0 ? 'Agendado' : (openFolha.length === items.length ? 'Em Aberto' : 'Misto');
            displayItems.push({ type: 'folha-summary' as const, key: `folha-summary-${cat}`, data: { category: cat, count: items.length, openCount: openFolha.length, status: statusText, valor: totalValue } });
        });
    }
    displayItems.push(...loja.agend.map((a, i) => ({ type: 'agend' as const, data: a, originalIndex: i })));
    displayItems.push(...loja.transf.map((t, i) => ({ type: 'transf' as const, data: t, originalIndex: i })));
    displayItems.push(...loja.receb.map((r, i) => ({ type: 'receb' as const, data: r, originalIndex: i })));
    return displayItems;
  }, [loja]);

  const totalDDA = loja.dda.reduce((acc, d) => acc + d.valor, 0);
  const totalFolha = (loja.folha || []).reduce((acc, f) => acc + f.valor, 0);
  const totalAgend = loja.agend.reduce((acc, a) => acc + a.valor, 0);
  const totalTransf = loja.transf.reduce((acc, t) => acc + Math.abs(t.valor), 0);
  const totalDespesas = totalDDA + totalFolha + totalAgend + totalTransf;
  const totalReceb = loja.receb.reduce((acc, r) => acc + r.valor, 0);
  
  // O saldo final agora inclui os recebimentos de transferências entre lojas
  const saldoFinal = loja.saldoInicial - totalDespesas + totalReceb;

  const btnBaseClass = "px-3 py-2 text-xs sm:text-sm rounded-xl font-bold bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-primary/5 dark:hover:bg-dark-primary/10 transition-all flex items-center gap-2 shadow-sm active:scale-95";

  return (
    <div className="bg-light-panel dark:bg-dark-panel rounded-3xl shadow-xl border border-light-border dark:border-dark-border transition-all duration-300">
      <div className="p-6 border-b border-light-border dark:border-dark-border flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-light-heading dark:text-dark-heading tracking-tight">{nome}</h2>
          <div className="relative" ref={actionsMenuRef}>
            <button onClick={() => setIsActionsMenuOpen(prev => !prev)} className="p-2 rounded-xl bg-light-bg dark:bg-dark-bg text-light-subtle dark:text-dark-subtle hover:text-light-danger transition-colors border border-light-border dark:border-dark-border shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            {isActionsMenuOpen && (
                <div className="absolute left-0 mt-3 w-56 bg-white dark:bg-dark-panel rounded-2xl shadow-2xl z-20 border border-light-border dark:border-dark-border py-2 overflow-hidden animate-fade-in-scale">
                    <button onClick={handleClearEntriesRequest} className="w-full text-left px-4 py-2.5 text-sm font-bold text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition flex items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-light-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Limpar Lançamentos</button>
                    <button onClick={() => { setIsActionsMenuOpen(false); onDeleteStore(); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-light-danger dark:text-dark-danger hover:bg-light-danger/10 transition flex items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Excluir Loja</button>
                </div>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
            <label className="text-[8px] font-bold uppercase tracking-widest text-light-subtle dark:text-dark-subtle mb-1">Saldo em Caixa</label>
            <div className="flex items-center gap-2 border-b border-light-border dark:border-dark-border pb-1 focus-within:border-light-primary transition-colors">
                <span className="text-[10px] font-bold text-light-subtle">R$</span>
                <input type="text" value={saldoDisplay} onChange={handleSaldoInputChange} onBlur={handleSaldoInputBlur} className="bg-transparent text-right font-bold text-base w-40 border-none focus:outline-none text-light-heading dark:text-dark-heading" />
            </div>
        </div>
      </div>
      <div className="p-4 flex flex-wrap items-center gap-3 bg-light-bg/40 dark:bg-dark-bg/40 border-b border-light-border dark:border-dark-border">
        <input type="file" ref={ddaFileInputRef} onChange={handleDdaFileChange} accept=".xlsx,.xls,.csv,image/*,application/pdf" className="hidden" />
        <input type="file" ref={salaryFileInputRef} onChange={handleSalaryFileChange} accept=".xlsx,.xls,.csv,image/*,application/pdf" className="hidden" />
        <div className="relative" ref={importMenuRef}>
            <button onClick={() => setIsImportMenuOpen(!isImportMenuOpen)} className={`${btnBaseClass} !bg-light-primary !text-white border-none hover:shadow-lg`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Importar Arquivos<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>
            {isImportMenuOpen && (
                <div className="absolute left-0 mt-3 w-64 bg-white dark:bg-dark-panel backdrop-blur-md rounded-2xl shadow-2xl z-30 border border-light-border dark:border-dark-border py-2 overflow-hidden animate-fade-in-scale">
                    <button onClick={() => ddaFileInputRef.current?.click()} className="w-full text-left px-5 py-3 text-sm font-bold text-light-text dark:text-dark-text hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition flex items-center gap-4"><div className="w-8 h-8 rounded-lg bg-light-primary/10 flex items-center justify-center text-light-primary"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>DDA (Boleto/Excel)</button>
                    <button onClick={() => salaryFileInputRef.current?.click()} className="w-full text-left px-5 py-3 text-sm font-bold text-light-text dark:text-dark-text hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition flex items-center gap-4"><div className="w-8 h-8 rounded-lg bg-light-accent/10 flex items-center justify-center text-light-accent"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>Folha de Pagamento</button>
                </div>
            )}
        </div>
        <button onClick={() => { setEditingSchedule(null); setScheduleModalOpen(true); }} className={btnBaseClass}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-light-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM12 18v-3m0 0v-3m0 3h3m-3 0H9" /></svg>Agendamento</button>
        <button onClick={() => { setEditingTransfer(null); setTransferModalOpen(true); }} className={btnBaseClass}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-light-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>Transferência</button>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-[10px] font-black uppercase bg-light-bg dark:bg-dark-bg text-light-subtle dark:text-dark-subtle tracking-[0.1em]"><tr><th scope="col" className="px-6 py-4">Tipo</th><th scope="col" className="px-6 py-4">Beneficiário</th><th scope="col" className="px-6 py-4">Descrição</th><th scope="col" className="px-6 py-4">Situação</th><th scope="col" className="px-6 py-4">Data Pg.</th><th scope="col" className="px-6 py-4 text-right">Valor</th><th scope="col" className="px-6 py-4 text-center">Ações</th></tr></thead><tbody>{filteredItems.length > 0 ? filteredItems.map((item, index) => {
              switch (item.type) {
                case 'dda-summary': return (<tr key={item.key} onClick={onOpenDdaModal} className="border-b border-light-border dark:border-dark-border bg-light-bg/30 dark:bg-dark-bg/30 cursor-pointer hover:bg-light-primary/5 dark:hover:bg-dark-primary/10 transition-colors group"><td className="px-6 py-4 font-bold text-light-heading dark:text-dark-heading">DDA</td><td className="px-6 py-4 font-black text-light-text dark:text-dark-text group-hover:text-light-primary transition-colors">Lançamentos DDA</td><td className="px-6 py-4 text-[10px] font-bold text-light-subtle dark:text-dark-subtle">Total de {item.data.count} itens importados</td><td className="px-6 py-4"><span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${item.data.status === 'Agendado' ? 'bg-light-accent/10 text-light-accent' : 'bg-light-warning/10 text-light-warning'}`}>{item.data.status}</span></td><td className="px-6 py-4 text-light-subtle dark:text-dark-subtle">-</td><td className="px-6 py-4 text-right font-mono font-black text-light-danger dark:text-dark-danger">{toBRL(item.data.valor)}</td><td className="px-6 py-4 text-center"><button onClick={(e) => { e.stopPropagation(); onOpenDdaModal(); }} className="p-2 rounded-xl bg-light-bg dark:bg-dark-bg text-light-subtle hover:text-light-primary transition-all border border-light-border dark:border-dark-border shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button></td></tr>);
                case 'folha-summary': return (<tr key={item.key} onClick={() => setFolhaModalOpen(true)} className="border-b border-light-border dark:border-dark-border bg-light-bg/30 dark:bg-dark-bg/30 cursor-pointer hover:bg-light-primary/5 dark:hover:bg-dark-primary/10 transition-colors group"><td className="px-6 py-4 font-bold text-light-primary dark:text-dark-primary">FOLHA</td><td className="px-6 py-4 font-black text-light-heading dark:text-dark-heading uppercase tracking-tight group-hover:text-light-primary transition-colors">{item.data.category}</td><td className="px-6 py-4 text-[10px] font-bold text-light-subtle dark:text-dark-subtle">Folha de Pagamento ({item.data.count} colaboradores)</td><td className="px-6 py-4"><span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${item.data.status === 'Agendado' ? 'bg-light-accent/10 text-light-accent' : 'bg-light-warning/10 text-light-warning'}`}>{item.data.status}</span></td><td className="px-6 py-4 text-light-subtle dark:text-dark-subtle">-</td><td className="px-6 py-4 text-right font-mono font-black text-light-danger dark:text-dark-danger">{toBRL(item.data.valor)}</td><td className="px-6 py-4 text-center"><button onClick={(e) => { e.stopPropagation(); setFolhaModalOpen(true); }} className="p-2 rounded-xl bg-light-bg dark:bg-dark-bg text-light-subtle hover:text-light-primary transition-all border border-light-border dark:border-dark-border shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button></td></tr>);
                case 'agend': {
                  const a = item.data as Agendamento;
                  return (
                    <tr key={`agend-${item.originalIndex}`} className="border-b border-light-border dark:border-dark-border hover:bg-light-primary/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-light-heading dark:text-dark-heading">AGEND</td>
                      <td className="px-6 py-4 font-black">{a.fornecedor}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-light-subtle dark:text-dark-subtle truncate max-w-[200px]">{a.descricao || '-'}</td>
                      <td className="px-6 py-4">
                        <span onClick={() => toggleStatus('agend', item.originalIndex)} className={`cursor-pointer px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${a.status === 'pago' ? 'bg-light-accent/10 text-light-accent' : 'bg-light-warning/10 text-light-warning'}`}>
                          {a.status === 'pago' ? 'Agendado' : 'Em Aberto'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-light-subtle dark:text-dark-subtle text-[11px]">{a.data}</td>
                      <td className="px-6 py-4 text-right font-mono font-black text-light-danger dark:text-dark-danger">{toBRL(a.valor)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {a.anexo && (
                            <a href={a.anexo} target="_blank" rel="noopener noreferrer" className="p-1.5 text-light-subtle hover:text-light-primary transition-colors" title="Ver Anexo">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                               </svg>
                            </a>
                          )}
                          <button onClick={() => { setEditingSchedule({ item: a, index: item.originalIndex }); setScheduleModalOpen(true); }} className="p-1.5 text-light-subtle hover:text-light-primary transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                          <button onClick={() => handleDeleteSchedule(item.originalIndex)} className="p-1.5 text-light-subtle hover:text-light-danger transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                case 'transf': {
                  const t = item.data as Transferencia;
                  return (
                    <tr key={`transf-${item.originalIndex}`} className="border-b border-light-border dark:border-dark-border hover:bg-light-primary/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-light-accent dark:text-dark-accent">TRANSF</td>
                      <td className="px-6 py-4 font-black">{t.desc}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-light-subtle dark:text-dark-subtle">Para: {t.destino}</td>
                      <td className="px-6 py-4">
                        <span onClick={() => toggleStatus('transf', item.originalIndex)} className={`cursor-pointer px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${t.status === 'pago' ? 'bg-light-accent/10 text-light-accent' : 'bg-light-warning/10 text-light-warning'}`}>
                          {t.status === 'pago' ? 'Agendado' : 'Em Aberto'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-light-subtle dark:text-dark-subtle text-[11px]">{t.data}</td>
                      <td className="px-6 py-4 text-right font-mono font-black text-light-danger dark:text-dark-danger">{toBRL(Math.abs(t.valor))}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditingTransfer({ item: t, index: item.originalIndex }); setTransferModalOpen(true); }} className="p-1.5 text-light-subtle hover:text-light-primary transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                          <button onClick={() => handleDeleteTransfer(item.originalIndex)} className="p-1.5 text-light-subtle hover:text-light-danger transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                case 'receb': {
                    const r = item.data as Recebimento;
                    const originTransfer = (Object.values(system.lojas) as Loja[]).flatMap(l => l.transf).find(t => t.id === r.id);
                    return (
                        <tr key={`receb-${item.originalIndex}`} className="border-b border-light-border dark:border-dark-border bg-light-accent/5 transition-colors">
                            <td className="px-6 py-4 font-bold text-light-accent">RECEB</td>
                            <td className="px-6 py-4 font-black">De: {originTransfer?.origem || 'Desconhecido'}</td>
                            <td className="px-6 py-4 text-[10px] font-bold text-light-subtle dark:text-dark-subtle">Entrada de Transferência</td>
                            <td className="px-6 py-4"><span className="px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider bg-light-accent/10 text-light-accent">Recebido</span></td>
                            <td className="px-6 py-4 text-light-subtle dark:text-dark-subtle text-[11px]">{originTransfer?.data || '-'}</td>
                            <td className="px-6 py-4 text-right font-mono font-black text-light-accent">+{toBRL(r.valor)}</td>
                            <td className="px-6 py-4 text-center text-light-subtle">-</td>
                        </tr>
                    );
                }
                default: return null;
              }
          }) : (
              <tr><td colSpan={7} className="text-center py-10 text-light-subtle font-bold italic uppercase tracking-widest text-[10px]">Nenhum lançamento ativo para esta loja.</td></tr>
          )}</tbody></table></div>
      
      <div className="p-6 bg-light-bg/50 dark:bg-dark-bg/50 rounded-b-3xl grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-light-border dark:border-dark-border">
          <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest text-light-subtle mb-1">Total Despesas</span><span className="text-lg font-black text-light-danger">{toBRL(totalDespesas)}</span></div>
          <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest text-light-subtle mb-1">Entradas (Transf)</span><span className="text-lg font-black text-light-accent">{toBRL(totalReceb)}</span></div>
          <div className="flex flex-col text-right"><span className="text-[10px] font-black uppercase tracking-widest text-light-subtle mb-1">Saldo Final Estimado</span><span className={`text-2xl font-black ${saldoFinal >= 0 ? 'text-light-accent' : 'text-light-danger'} drop-shadow-sm`}>{toBRL(saldoFinal)}</span></div>
      </div>

      <ScheduleModal isOpen={isScheduleModalOpen} onClose={() => setScheduleModalOpen(false)} onSave={handleSaveSchedule} schedule={editingSchedule} suppliers={system.fornecedores || []} onUpdateSuppliers={(ns) => onSystemUpdate({ ...system, fornecedores: ns })} paymentRules={paymentRules} />
      <TransferModal isOpen={isTransferModalOpen} onClose={() => setTransferModalOpen(false)} onSave={handleSaveTransfer} lojaOrigemNome={nome} lojasNomes={Object.keys(system.lojas)} transfer={editingTransfer} />
      <FolhaModal isOpen={isFolhaModalOpen} onClose={() => setFolhaModalOpen(false)} lojaNome={nome} folhaList={loja.folha || []} lojasNomes={Object.keys(system.lojas)} onUpdateFolhaList={(nl) => onUpdateLoja({ ...loja, folha: nl })} onTransferItem={handleTransferFolhaItem} onImportFile={onImportSalary} onOpenCollaborators={onOpenCollaborators} system={system} onUpdateSystem={onSystemUpdate} />
      <ConfirmationModal isOpen={confirmState.isOpen} onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} onConfirm={handleConfirmAction} title={confirmState.title} message={confirmState.message} confirmVariant={confirmState.confirmVariant} />
    </div>
  );
};

export default StoreCard;
