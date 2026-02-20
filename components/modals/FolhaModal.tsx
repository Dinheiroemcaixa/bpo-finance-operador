
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '../ui/Modal';
import ConfirmationModal from '../ui/ConfirmationModal';
import { Agendamento, Group, Supplier } from '../../types';
import { toBRL, parseVal, formatCurrencyInput, toBRLInput } from '../../utils/formatters';
import { exportFolhaToExcel } from '../../services/excelService';
import { exportFolhaToPdf } from '../../services/pdfService';

interface FolhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojaNome: string;
  folhaList: Agendamento[];
  lojasNomes: string[];
  onUpdateFolhaList: (newList: Agendamento[]) => void;
  onTransferItem: (index: number, destinationStore: string) => void;
  onImportFile: (file: File) => void;
  onOpenCollaborators: () => void; // Nova prop
  system: Group;
  onUpdateSystem: (updatedSystem: Group) => void;
}

const FolhaModal: React.FC<FolhaModalProps> = ({ isOpen, onClose, lojaNome, folhaList, lojasNomes, onUpdateFolhaList, onTransferItem, onImportFile, onOpenCollaborators, system, onUpdateSystem }) => {
  const [editingItem, setEditingItem] = useState<(Agendamento & { index: number }) | null>(null);
  const [transferringItem, setTransferringItem] = useState<{ item: Agendamento, index: number } | null>(null);
  const [destinationStore, setDestinationStore] = useState('');
  
  const [formNome, setFormNome] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formData, setFormData] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formChavePix, setFormChavePix] = useState('');
  const [formStatus, setFormStatus] = useState<'aberto' | 'pago'>('aberto');
  const [formCategoria, setFormCategoria] = useState<Agendamento['categoriaFolha']>('SALÁRIO');
  const [bulkCategory, setBulkCategory] = useState<Agendamento['categoriaFolha']>('SALÁRIO');
  
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string; confirmVariant?: 'primary' | 'danger' }>({ isOpen: false, onConfirm: () => {}, title: '', message: '', confirmVariant: 'primary' });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isExportMenuOpen, setExportMenuOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
        setEditingItem(null);
        setTransferringItem(null);
        setSelectedIndices(new Set());
        setExportMenuOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingItem) {
        setFormNome(editingItem.fornecedor);
        setFormValor(toBRLInput(editingItem.valor));
        setFormData(editingItem.data);
        setFormDesc(editingItem.descricao || '');
        setFormChavePix(editingItem.chavePix || '');
        setFormStatus(editingItem.status || 'aberto');
        setFormCategoria(editingItem.categoriaFolha || 'SALÁRIO');
    }
  }, [editingItem]);

  useEffect(() => {
    if (transferringItem) {
      const otherStores = lojasNomes.filter(name => name !== lojaNome);
      setDestinationStore(otherStores[0] || '');
    }
  }, [transferringItem, lojasNomes, lojaNome]);

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingItem) return;

      const updatedList = [...folhaList];
      updatedList[editingItem.index] = {
          ...editingItem,
          fornecedor: formNome,
          valor: parseVal(formValor),
          data: formData,
          descricao: formDesc,
          chavePix: formChavePix,
          status: formStatus,
          categoriaFolha: formCategoria
      };
      
      // PERSISTÊNCIA NA BASE GLOBAL (A "MEMÓRIA" DO APP)
      const normalize = (name: string) => 
        name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, ' ');

      const normalizedFormName = normalize(formNome);
      const currentSuppliers = [...(system.fornecedores || [])];
      
      const existingIdx = currentSuppliers.findIndex(f => normalize(f.name) === normalizedFormName);
      
      // Se tivermos um PIX preenchido ou se o colaborador já existia, atualizamos a base global
      if (existingIdx >= 0) {
        // Atualiza colaborador existente
        currentSuppliers[existingIdx] = { 
            ...currentSuppliers[existingIdx], 
            name: formNome.trim(), 
            chavePix: formChavePix.trim() 
        };
      } else {
        // Adiciona novo colaborador ao "banco de dados" do grupo
        currentSuppliers.push({
            id: `colab-${Date.now()}`,
            name: formNome.trim(),
            chavePix: formChavePix.trim()
        });
      }

      // IMPORTANTE: Atualiza o sistema global primeiro para salvar o PIX na memória do grupo
      onUpdateSystem({ ...system, fornecedores: currentSuppliers });
      
      // Depois atualiza a lista visual da folha
      onUpdateFolhaList(updatedList);
      setEditingItem(null);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringItem || !destinationStore) return;
    onTransferItem(transferringItem.index, destinationStore);
    setTransferringItem(null);
    alert(`Colaborador ${transferringItem.item.fornecedor} transferido para ${destinationStore}.`);
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === folhaList.length && folhaList.length > 0) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(folhaList.map((_, i) => i)));
    }
  };

  const handleScheduleSelected = () => {
    const abertos = Array.from(selectedIndices).filter((i: number) => folhaList[i].status === 'aberto');
    if (abertos.length === 0) return;
    const updatedList = folhaList.map((item, i) => 
        selectedIndices.has(i) ? { ...item, status: 'pago' as const } : item
    );
    onUpdateFolhaList(updatedList);
    setSelectedIndices(new Set());
  };

  const handleReopenSelected = () => {
    const pagos = Array.from(selectedIndices).filter((i: number) => folhaList[i].status === 'pago');
    if (pagos.length === 0) return;
    const updatedList = folhaList.map((item, i) => 
        selectedIndices.has(i) ? { ...item, status: 'aberto' as const } : item
    );
    onUpdateFolhaList(updatedList);
    setSelectedIndices(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedIndices.size === 0) return;
    setConfirmState({
        isOpen: true,
        onConfirm: () => {
            const updatedList = folhaList.filter((_, i) => !selectedIndices.has(i));
            onUpdateFolhaList(updatedList);
            setSelectedIndices(new Set());
            setConfirmState({ ...confirmState, isOpen: false });
        },
        title: `Excluir ${selectedIndices.size} Lançamento(s)`,
        message: 'Tem certeza que deseja excluir permanentemente estes registros de folha?',
        confirmVariant: 'danger'
    });
  };

  const handleBulkCategoryUpdate = () => {
    if (selectedIndices.size === 0) return;
    const updatedList = folhaList.map((item, i) => 
        selectedIndices.has(i) ? { ...item, categoriaFolha: bulkCategory } : item
    );
    onUpdateFolhaList(updatedList);
    setSelectedIndices(new Set());
    alert(`Categoria alterada para ${bulkCategory} em ${selectedIndices.size} colaborador(es).`);
  };

  const handleDeleteIndividual = (index: number, name: string) => {
    setConfirmState({
        isOpen: true,
        onConfirm: () => {
            const updatedList = folhaList.filter((_, i) => i !== index);
            onUpdateFolhaList(updatedList);
            setConfirmState({ ...confirmState, isOpen: false });
        },
        title: 'Excluir Colaborador',
        message: `Tem certeza que deseja remover "${name}" da folha de pagamento?`,
        confirmVariant: 'danger'
    });
  };

  const total = folhaList.reduce((acc, i) => acc + i.valor, 0);
  const totalAberto = folhaList.reduce((acc, i) => i.status === 'aberto' ? acc + i.valor : acc, 0);
  const totalSelecionado = folhaList.reduce((acc, d, i) => selectedIndices.has(i) ? acc + d.valor : acc, 0);

  const getCategoryBadgeClass = (cat?: string) => {
    switch(cat) {
      case 'ADIANTAMENTO SALARIAL': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'GRATIFICAÇÃO': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case '13°': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    }
  };

  const hasPaidInSelection = Array.from(selectedIndices).some((i: number) => folhaList[i]?.status === 'pago');
  const hasOpenInSelection = Array.from(selectedIndices).some((i: number) => folhaList[i]?.status === 'aberto');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Folha de Pagamento - ${lojaNome}`} size="6xl">
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])} accept="application/pdf,image/*,.xlsx,.xls,.csv" />
      
      <div className="max-h-[60vh] flex flex-col">
        {editingItem ? (
            <form onSubmit={handleSaveEdit} className="space-y-4 p-4 bg-light-bg dark:bg-dark-bg rounded-lg">
                <h3 className="font-bold text-lg border-b border-light-border dark:border-dark-border pb-2">Editando Lançamento de Folha</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                      <label className="text-sm font-medium">Nome do Colaborador</label>
                      <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none"/>
                  </div>
                  <div>
                      <label className="text-sm font-medium">Categoria</label>
                      <select value={formCategoria} onChange={e => setFormCategoria(e.target.value as any)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none">
                          <option value="SALÁRIO">Salário</option>
                          <option value="ADIANTAMENTO SALARIAL">Adiantamento Salarial</option>
                          <option value="GRATIFICAÇÃO">Gratificação</option>
                          <option value="13°">13° Salário</option>
                      </select>
                  </div>
                  <div>
                      <label className="text-sm font-medium">Valor Líquido</label>
                      <input type="text" value={formValor} onChange={e => setFormValor(formatCurrencyInput(e.target.value))} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border text-right focus:ring-2 focus:ring-light-primary font-mono outline-none"/>
                  </div>
                  <div>
                      <label className="text-sm font-medium">Data Pgto.</label>
                      <input type="date" value={formData} onChange={e => setFormData(e.target.value)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none"/>
                  </div>
                  <div>
                      <label className="text-sm font-medium">Situação</label>
                      <select value={formStatus} onChange={e => setFormStatus(e.target.value as any)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none">
                          <option value="aberto">Em Aberto</option>
                          <option value="pago">Agendado</option>
                      </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Descrição/CPF</label>
                    <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Chave PIX</label>
                    <input type="text" value={formChavePix} onChange={e => setFormChavePix(e.target.value)} className="w-full mt-1 p-2 rounded bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none"/>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-light-border dark:border-dark-border">
                    <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:opacity-80">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 shadow-md">Atualizar Lançamento</button>
                </div>
            </form>
        ) : transferringItem ? (
          <form onSubmit={handleTransferSubmit} className="space-y-4 p-6 bg-light-bg dark:bg-dark-bg rounded-xl border border-light-border dark:border-dark-border shadow-inner">
             <div className="flex items-center gap-3 mb-2 text-light-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                <h3 className="font-bold text-lg">Transferir para outra Loja</h3>
             </div>
             <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-light-border dark:border-dark-border">
                <p className="text-sm">Colaborador: <span className="font-bold">{transferringItem.item.fornecedor}</span></p>
                <p className="text-sm">Valor: <span className="font-bold text-light-danger">{toBRL(transferringItem.item.valor)}</span></p>
             </div>
             <div>
                <label className="block text-sm font-medium mb-1">Loja de Destino</label>
                <select value={destinationStore} onChange={e => setDestinationStore(e.target.value)} className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none" required>
                  {lojasNomes.filter(name => name !== lojaNome).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
             </div>
             <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setTransferringItem(null)} className="px-5 py-2 text-sm rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:opacity-80">Cancelar</button>
                <button type="submit" disabled={!destinationStore} className="px-5 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90">Confirmar</button>
             </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap justify-between items-center mb-4 px-1 gap-4 min-h-[44px]">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 transition flex items-center gap-2 shadow-md shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Importar Relatório
                  </button>

                  <div className="relative" ref={exportMenuRef}>
                    <button type="button" onClick={() => setExportMenuOpen(!isExportMenuOpen)} className="px-4 py-2 text-sm rounded-lg font-semibold text-light-text dark:text-dark-text bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border hover:bg-light-bg/80 transition flex items-center gap-2 shadow-md shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Exportar
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isExportMenuOpen && (
                      <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-dark-panel rounded-md shadow-lg z-[100] border border-light-border dark:border-dark-border py-1">
                        <button type="button" onClick={() => { exportFolhaToExcel(folhaList, lojaNome); setExportMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border transition">
                          Excel (.xlsx)
                        </button>
                        <button type="button" onClick={() => { exportFolhaToPdf(folhaList, lojaNome); setExportMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border transition border-t border-light-border dark:border-dark-border">
                          PDF (.pdf)
                        </button>
                      </div>
                    )}
                  </div>

                  <button onClick={onOpenCollaborators} className="px-4 py-2 text-sm rounded-lg font-semibold text-light-text dark:text-dark-text bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border transition flex items-center gap-2 shadow-md shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-light-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    Colaboradores
                  </button>
                </div>

                {selectedIndices.size > 0 && (
                  <div className="flex items-center gap-2 bg-light-primary/5 dark:bg-dark-primary/10 p-2 rounded-xl border border-light-primary/20 animate-fade-in-scale">
                      <span className="text-[10px] font-bold text-light-primary uppercase ml-2 mr-1">Massa:</span>
                      <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value as any)} className="text-xs p-1.5 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-gray-800 outline-none">
                        <option value="SALÁRIO">Salário</option>
                        <option value="ADIANTAMENTO SALARIAL">Adiantamento</option>
                        <option value="GRATIFICAÇÃO">Gratificação</option>
                        <option value="13°">13°</option>
                      </select>
                      <button onClick={handleBulkCategoryUpdate} className="p-1.5 rounded-lg bg-light-primary text-white hover:opacity-90 transition shadow-sm" title="Aplicar Categoria"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                      <div className="w-px h-6 bg-light-border dark:bg-dark-border mx-1"></div>
                      <button onClick={handleDeleteSelected} className="px-3 py-1.5 text-xs rounded-lg font-semibold text-white bg-light-danger dark:bg-dark-danger hover:opacity-90 transition shadow-sm">Excluir ({selectedIndices.size})</button>
                      
                      {hasOpenInSelection && (
                        <button onClick={handleScheduleSelected} className="px-3 py-1.5 text-xs rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 transition shadow-sm">Agendar</button>
                      )}

                      {hasPaidInSelection && (
                        <button onClick={handleReopenSelected} className="px-3 py-1.5 text-xs rounded-lg font-semibold text-white bg-light-warning dark:bg-dark-warning hover:opacity-90 transition shadow-sm">Voltar para Aberto</button>
                      )}
                  </div>
                )}
            </div>

            <div className="overflow-y-auto flex-grow border border-light-border dark:border-dark-border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase bg-light-bg dark:bg-dark-bg text-light-subtle dark:text-dark-subtle sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2"><input type="checkbox" checked={selectedIndices.size > 0 && selectedIndices.size === folhaList.length} onChange={handleSelectAll} className="rounded" /></th>
                    <th className="px-4 py-2">Colaborador</th>
                    <th className="px-4 py-2">Categoria</th>
                    <th className="px-4 py-2">Identificação</th>
                    <th className="px-4 py-2">Vencimento</th>
                    <th className="px-4 py-2">Situação</th>
                    <th className="px-4 py-2 text-right">Valor Líquido</th>
                    <th className="px-4 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {folhaList.length > 0 ? folhaList.map((item, i) => (
                    <tr key={i} className={`border-b border-light-border dark:border-dark-border hover:bg-light-bg/30 ${selectedIndices.has(i) ? 'bg-light-primary/5' : ''}`}>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={selectedIndices.has(i)} onChange={() => {
                          const newS = new Set(selectedIndices);
                          if (newS.has(i)) newS.delete(i); else newS.add(i);
                          setSelectedIndices(newS);
                        }} className="rounded" />
                      </td>
                      <td className="px-4 py-3 font-bold text-light-heading dark:text-dark-heading">{item.fornecedor}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${getCategoryBadgeClass(item.categoriaFolha)}`}>
                          {item.categoriaFolha || 'SALÁRIO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-light-subtle dark:text-dark-subtle text-[11px]">{item.descricao}{item.chavePix && <span className="block font-medium text-light-accent mt-0.5">PIX: {item.chavePix}</span>}</td>
                      <td className="px-4 py-3 text-[11px] whitespace-nowrap">{new Date(item.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${ item.status === 'pago' ? 'bg-light-accent/10 text-light-accent' : 'bg-light-warning/10 text-light-warning' }`}>
                          {item.status === 'pago' ? 'Agendado' : 'Em Aberto'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{toBRL(item.valor)}</td>
                      <td className="px-4 py-3 text-center">
                         <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setEditingItem({ ...item, index: i })} className="p-1 text-light-subtle hover:text-light-primary transition-colors" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                            <button onClick={() => setTransferringItem({ item, index: i })} className="p-1 text-light-subtle hover:text-light-accent transition-colors" title="Transferir"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></button>
                            <button onClick={() => handleDeleteIndividual(i, item.fornecedor)} className="p-1 text-light-subtle hover:text-light-danger transition-colors" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className="text-center py-10 text-light-subtle">Nenhum lançamento de folha.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      
      <div className="mt-4 p-4 rounded-xl bg-light-bg dark:bg-dark-bg text-sm flex justify-between shadow-inner">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-light-subtle">Total Folha</span>
            <span className="font-bold text-light-heading dark:text-dark-heading text-lg">{toBRL(total)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold uppercase text-light-warning">Pendente</span>
            <span className="font-bold text-lg text-light-warning">{toBRL(totalAberto)}</span>
          </div>
          {selectedIndices.size > 0 && (
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold uppercase text-light-primary">Selecionado</span>
              <span className="font-bold text-lg text-light-primary">{toBRL(totalSelecionado)}</span>
            </div>
          )}
      </div>
      
      <ConfirmationModal isOpen={confirmState.isOpen} onClose={() => setConfirmState({...confirmState, isOpen: false})} onConfirm={confirmState.onConfirm} title={confirmState.title} message={confirmState.message} confirmVariant={confirmState.confirmVariant} />
    </Modal>
  );
};

export default FolhaModal;
