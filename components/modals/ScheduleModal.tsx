
import React, { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import { Agendamento, Supplier, PaymentRule } from '../../types';
import { parseVal, toBRL, formatCurrencyInput, toBRLInput } from '../../utils/formatters';
import { processBoletoImage, processSalaryReportImage } from '../../services/geminiService';
import NewSupplierModal from './NewSupplierModal';
import { supabase } from '../../services/supabaseClient';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: Agendamento | Agendamento[], index?: number) => void;
  schedule: { item: Agendamento, index: number } | null;
  suppliers: Supplier[];
  onUpdateSuppliers: (newSuppliers: Supplier[]) => void;
  onDelete?: (index: number) => void;
  paymentRules: PaymentRule[];
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onSave, schedule, suppliers, onUpdateSuppliers, onDelete, paymentRules }) => {
  const [fornecedor, setFornecedor] = useState('');
  const [tipo, setTipo] = useState<'PIX' | 'Boleto' | 'Recibo' | 'NF-e' | 'Cheque' | 'Guia' | 'Outros'>('PIX');
  const [valor, setValor] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [descricao, setDescricao] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [alertWarning, setAlertWarning] = useState<{ message: string, isRecurring?: boolean } | null>(null);
  const [bulkItems, setBulkItems] = useState<Agendamento[] | null>(null);
  
  // File Upload States
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formId = "schedule-form";
  
  useEffect(() => {
    if (isOpen) {
      if (schedule) {
        setFornecedor(schedule.item.fornecedor);
        setTipo(schedule.item.tipo);
        setValor(toBRLInput(schedule.item.valor));
        setChavePix(schedule.item.chavePix || '');
        setData(schedule.item.data || new Date().toISOString().split('T')[0]);
        setDescricao(schedule.item.descricao || '');
        setExistingAttachment(schedule.item.anexo || null);
      } else {
        setFornecedor('');
        setTipo('PIX');
        setValor('');
        setChavePix('');
        setData(new Date().toISOString().split('T')[0]);
        setDescricao('');
        setExistingAttachment(null);
      }
      setFileToUpload(null);
      setAlertWarning(null);
      setBulkItems(null);
    }
  }, [isOpen, schedule]);

  useEffect(() => {
    const checkRules = () => {
        if (!paymentRules || paymentRules.length === 0 || bulkItems) {
            setAlertWarning(null);
            return;
        }

        const currentVal = parseVal(valor);
        const normalize = (str: string) => str.replace(/\D/g, '');

        const matchedRule = paymentRules.find(r => {
            let match = true;
            if (r.term) {
                const textToCheck = (fornecedor + ' ' + descricao).toLowerCase();
                if (!textToCheck.includes(r.term.toLowerCase())) match = false;
            }
            if (match && r.matchDoc) {
                 const textToSearch = (descricao + ' ' + chavePix).toLowerCase();
                 const ruleDocClean = normalize(r.matchDoc);
                 const textClean = normalize(textToSearch);
                 if (ruleDocClean.length > 4) {
                    if (!textClean.includes(ruleDocClean)) match = false;
                 } else {
                     if (!textToSearch.includes(r.matchDoc.toLowerCase())) match = false;
                 }
            }
            if (match && r.matchValue !== undefined) {
                 if (Math.abs(r.matchValue - currentVal) > 0.01) match = false;
            }
            if (match && r.matchDate) {
                 if (r.matchDate !== data) match = false;
            }
            return match;
        });

        if (matchedRule) {
            setAlertWarning({ message: matchedRule.alertMessage, isRecurring: matchedRule.isRecurring });
        } else {
            setAlertWarning(null);
        }
    };
    checkRules();
  }, [fornecedor, descricao, valor, data, chavePix, paymentRules, bulkItems]);

  const processFile = async (file: File) => {
    if (!file) return;

    const acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!acceptedTypes.includes(file.type)) {
        alert('Tipo de arquivo inválido. Por favor, use PDF, JPG ou PNG.');
        return;
    }

    setFileToUpload(file); // Guarda o arquivo para upload no submit
    setIsLoading(true);
    
    try {
        // Tentativa de detectar se é folha de pagamento pelo nome ou conteúdo
        const isSalaryLikely = file.name.toLowerCase().includes('liquido') || file.name.toLowerCase().includes('folha') || file.name.toLowerCase().includes('relatorio');
        
        if (isSalaryLikely) {
            const extractedItems = await processSalaryReportImage(file);
            if (extractedItems.length > 1) {
                setBulkItems(extractedItems.map(item => ({
                    ...item,
                    tipo: 'PIX', // Default para folha
                    status: 'aberto' as const
                })));
                setIsLoading(false);
                return;
            }
        }

        const boletoData = await processBoletoImage(file);
        if (boletoData) {
            setFornecedor(boletoData.fornecedor);
            setData(boletoData.data);
            setValor(toBRLInput(boletoData.valor));
            setTipo('Boleto');
        }
    } catch (error) {
        console.error("Erro ao importar arquivo:", error);
        alert(`Erro ao importar arquivo: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleUploadFile = async (): Promise<string | null> => {
      if (!fileToUpload) return existingAttachment;
      
      setIsUploading(true);
      try {
          const fileExt = fileToUpload.name.split('.').pop();
          const cleanName = fileToUpload.name.replace(/[^\w.-]/g, '');
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${cleanName}`;
          
          const { error } = await supabase.storage.from('documents').upload(fileName, fileToUpload);
          
          if (error) {
              console.error("Supabase Storage Error:", error);
              // Fallback gracioso: se o bucket não existir, apenas avisa mas deixa salvar o registro sem anexo
              alert(`Aviso: Não foi possível salvar o anexo na nuvem. Verifique se o bucket 'documents' existe no Supabase. Erro: ${error.message}`);
              return null;
          }
          
          const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
          return data.publicUrl;
      } catch (err) {
          console.error("Upload exception:", err);
          return null;
      } finally {
          setIsUploading(false);
      }
  };

  const handleImportBoleto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processFile(file);
    if (event.target) event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) await processFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Upload do Arquivo (Se houver)
    const attachmentUrl = await handleUploadFile();

    // 2. Lógica de Importação em Massa
    if (bulkItems) {
        // Se houver um arquivo, anexa o mesmo arquivo (relatório) para todos os itens da folha
        const itemsWithAttachment = bulkItems.map(item => ({
            ...item,
            anexo: attachmentUrl || undefined
        }));
        onSave(itemsWithAttachment);
        onClose();
        return;
    }

    if (fornecedor.trim() && parseVal(valor) > 0) {
      // Auto-save supplier functionality
      const normalizedName = fornecedor.trim();
      const existingSupplierIndex = suppliers.findIndex(s => s.name.toLowerCase() === normalizedName.toLowerCase());
      
      let updatedSuppliers = [...suppliers];
      let hasSupplierUpdate = false;

      if (existingSupplierIndex >= 0) {
          // Update existing supplier if PIX is provided and differs
          if (chavePix.trim() && suppliers[existingSupplierIndex].chavePix !== chavePix.trim()) {
              updatedSuppliers[existingSupplierIndex] = { 
                  ...updatedSuppliers[existingSupplierIndex], 
                  chavePix: chavePix.trim() 
              };
              hasSupplierUpdate = true;
          }
      } else {
          // Add new supplier
          const newSupplier: Supplier = {
              id: `sup-${Date.now()}`,
              name: normalizedName,
              chavePix: chavePix.trim()
          };
          updatedSuppliers.push(newSupplier);
          hasSupplierUpdate = true;
      }

      if (hasSupplierUpdate) {
          onUpdateSuppliers(updatedSuppliers.sort((a, b) => a.name.localeCompare(b.name)));
      }

      const newSchedule: Agendamento = {
        fornecedor: fornecedor.trim(),
        tipo,
        valor: parseVal(valor),
        chavePix: tipo === 'PIX' ? chavePix.trim() : '',
        status: schedule?.item.status || 'aberto',
        data,
        descricao: descricao.trim(),
        anexo: attachmentUrl || undefined // Salva a URL do anexo
      };
      onSave(newSchedule, schedule?.index);
      onClose();
    }
  };

  const handleFornecedorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFornecedor(newName);
    // Case-insensitive check to find supplier
    const selected = suppliers.find(s => s.name.toLowerCase() === newName.toLowerCase());
    if (selected) setChavePix(selected.chavePix || '');
  };

  const handleSaveSupplier = (newSupplierData: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = { ...newSupplierData, id: `sup-${Date.now()}` };
    const updatedSuppliers = [...suppliers, newSupplier].sort((a, b) => a.name.localeCompare(b.name));
    onUpdateSuppliers(updatedSuppliers);
    setFornecedor(newSupplier.name);
    if (newSupplier.chavePix) setChavePix(newSupplier.chavePix);
    setIsNewSupplierModalOpen(false);
  };

  const handleDeleteSupplier = () => {
    const normalizedName = fornecedor.trim().toLowerCase();
    const existingSupplier = suppliers.find(s => s.name.toLowerCase() === normalizedName);
    
    if (existingSupplier) {
        if (confirm(`Deseja remover "${existingSupplier.name}" da lista de fornecedores salvos?`)) {
            const updatedSuppliers = suppliers.filter(s => s.id !== existingSupplier.id);
            onUpdateSuppliers(updatedSuppliers);
            setFornecedor('');
            setChavePix('');
        }
    }
  };

  // Case-insensitive check for button visibility
  const isKnownSupplier = suppliers.some(s => s.name.toLowerCase() === fornecedor.trim().toLowerCase());

  const title = (
    <div className="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span>{bulkItems ? "Importação em Massa" : schedule ? "Editar Agendamento" : "Novo Agendamento"}</span>
    </div>
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={bulkItems ? "2xl" : "lg"}
      footer={
        <div className="flex items-center justify-between w-full">
            <div>
                {schedule && onDelete && (
                    <button type="button" onClick={() => { onDelete(schedule.index); onClose(); }} className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-danger dark:bg-dark-danger hover:opacity-90">Excluir</button>
                )}
            </div>
            <div className="flex items-center gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:opacity-80">Cancelar</button>
                <button type="submit" form={formId} disabled={isUploading} className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                    {isUploading && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {bulkItems ? `Lançar ${bulkItems.length} Colaboradores` : (isUploading ? "Enviando..." : "Salvar")}
                </button>
            </div>
        </div>
      }
    >
      <div className="relative">
        {isLoading && (
            <div className="absolute inset-0 bg-light-panel/80 dark:bg-dark-panel/80 flex items-center justify-center z-10 rounded-2xl">
                <div className="flex flex-col items-center gap-2 text-light-heading dark:text-dark-heading text-center p-4">
                    <svg className="animate-spin h-8 w-8 text-light-primary mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="font-bold">Processando documento...</span>
                    <p className="text-xs text-light-subtle">Identificando colaboradores e valores líquidos.</p>
                </div>
            </div>
        )}
        <div className="max-h-[65vh] overflow-y-auto pr-2">
            
            {alertWarning && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg flex items-center gap-2 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-bold">{alertWarning.message}</span>
                </div>
            )}

            <form id={formId} onSubmit={handleSubmit} className="space-y-4">
            {bulkItems ? (
                <div className="space-y-4">
                    <div className="bg-light-bg dark:bg-dark-bg p-3 rounded-lg border border-light-border dark:border-dark-border text-xs text-light-subtle">
                        Relatório identificado: <strong>{bulkItems.length} colaboradores</strong> encontrados. Verifique os dados abaixo antes de confirmar o lançamento individual.
                    </div>
                    <div className="divide-y divide-light-border dark:divide-dark-border border border-light-border dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                        {bulkItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition">
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-light-heading dark:text-dark-heading">{item.fornecedor}</span>
                                    <span className="text-xs text-light-subtle">{item.descricao}</span>
                                </div>
                                <div className="text-right flex flex-col">
                                    <span className="font-mono text-sm font-bold text-light-danger dark:text-dark-danger">{toBRL(item.valor)}</span>
                                    <span className="text-[10px] text-light-subtle uppercase">Venc: {new Date(item.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between p-4 bg-light-primary/5 dark:bg-dark-primary/5 rounded-xl border-2 border-dashed border-light-primary/20">
                        <span className="font-bold text-light-subtle">Total da Folha:</span>
                        <span className="font-bold text-lg text-light-primary dark:text-dark-primary">
                            {toBRL(bulkItems.reduce((acc, item) => acc + item.valor, 0))}
                        </span>
                    </div>
                </div>
            ) : (
                <>
                
                <input type="file" ref={fileInputRef} onChange={handleImportBoleto} accept="application/pdf,image/jpeg,image/png" className="hidden" />
                
                {/* Drag and Drop Zone - Agora exibe o arquivo selecionado */}
                <div
                onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors duration-300 relative group ${ isDragging ? 'border-light-primary bg-light-primary/10 dark:border-dark-primary dark:bg-dark-primary/10' : 'border-light-border dark:border-dark-border hover:border-light-primary/50 dark:hover:border-dark-primary/50' }`}
                >
                    {fileToUpload ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="bg-light-accent/10 text-light-accent p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="font-bold text-sm text-light-heading dark:text-dark-heading">{fileToUpload.name}</p>
                            <p className="text-xs text-light-subtle">Arquivo pronto para upload</p>
                            
                            <div className="flex gap-4 mt-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const url = URL.createObjectURL(fileToUpload);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = fileToUpload.name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="text-xs font-bold text-light-primary hover:underline flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Baixar
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setFileToUpload(null); }}
                                    className="text-xs font-bold text-light-danger hover:underline flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Remover
                                </button>
                            </div>
                        </div>
                    ) : existingAttachment ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                             <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </div>
                            <p className="font-bold text-sm text-light-heading dark:text-dark-heading">Documento Anexado</p>
                            <a href={existingAttachment} target="_blank" rel="noopener noreferrer" className="text-xs text-light-primary hover:underline z-10 relative" onClick={(e) => e.stopPropagation()}>Visualizar Anexo Atual</a>
                            <p className="text-[10px] text-light-subtle mt-2">Clique ou arraste um novo arquivo para substituir</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-light-subtle dark:text-dark-subtle pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="font-semibold text-light-heading dark:text-dark-heading text-sm">Arraste e solte o boleto ou folha líquida aqui</p>
                            <p className="text-xs">Clique para selecionar PDF ou Imagem</p>
                            <span className="mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-light-bg dark:bg-dark-bg rounded-md">O arquivo será anexado ao lançamento</span>
                        </div>
                    )}
                </div>

                <div className="relative flex items-center !my-6">
                    <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                    <span className="flex-shrink mx-4 text-xs font-semibold text-light-subtle dark:text-dark-subtle tracking-wider">OU LANÇAMENTO MANUAL</span>
                    <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Fornecedor / Colaborador</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input list="suppliers-list" value={fornecedor} onChange={handleFornecedorChange} required className="w-full p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border" placeholder="Selecione ou digite..." />
                        <datalist id="suppliers-list">
                            {suppliers.map((s) => <option key={s.id} value={s.name} />)}
                        </datalist>
                        
                        {isKnownSupplier && (
                            <button type="button" onClick={handleDeleteSupplier} title="Excluir Fornecedor Salvo" className="p-2 rounded-md bg-light-danger/10 text-light-danger hover:bg-light-danger/20 shrink-0 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Data de Pagamento</label>
                        <input type="date" value={data} onChange={e => setData(e.target.value)} required className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Valor</label>
                        <input type="text" value={valor} placeholder="0,00" onChange={(e) => setValor(formatCurrencyInput(e.target.value))} required className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border text-right" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Descrição (opcional)</label>
                    <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} placeholder="Ex: Pagamento referente ao aluguel" className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Tipo</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border">
                        <option value="PIX">PIX</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Recibo">Recibo</option>
                        <option value="NF-e">NF-e</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Guia">Guia</option>
                        <option value="Outros">Outros</option>
                    </select>
                    </div>
                    {tipo === 'PIX' && (
                    <div>
                        <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Chave PIX</label>
                        <input type="text" value={chavePix} onChange={e => setChavePix(e.target.value)} className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border"/>
                    </div>
                    )}
                </div>
                </>
            )}
            </form>
        </div>
      </div>
    </Modal>
    <NewSupplierModal isOpen={isNewSupplierModalOpen} onClose={() => setIsNewSupplierModalOpen(false)} onSave={handleSaveSupplier} />
    </>
  );
};

export default ScheduleModal;
