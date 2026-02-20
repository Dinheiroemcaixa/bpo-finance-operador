
import React, { useState, useEffect } from 'react';
import { Group, Loja, DDA, Transferencia, Recebimento, Agendamento, PaymentRule, Supplier } from '../types';
import Header from './Header';
import StoreCard from './StoreCard';
import NewStoreModal from './modals/NewStoreModal';
import PaymentRulesModal from './modals/PaymentRulesModal';
import CollaboratorsModal from './modals/CollaboratorsModal';
import ConfirmationModal from './ui/ConfirmationModal';
import { processExcelFile, exportToExcel } from '../services/excelService';
import { exportToPdf } from '../services/pdfService';
import { processDdaImage, processSalaryReportImage, processSalaryExcel } from '../services/geminiService';
import DdaModal from './modals/DdaModal';

interface AppViewProps {
  system: Group;
  groupName: string;
  onBackToGroups: () => void;
  onNavigateToTransactions: () => void;
  onUpdateSystem: (updatedSystem: Group) => void;
  onExportJson: () => void; // Prop para backup global
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenCalculator: () => void;
  currentOperator: string;
  onLogout: () => void;
}

const AppView: React.FC<AppViewProps> = ({ system, groupName, onBackToGroups, onNavigateToTransactions, onUpdateSystem, onExportJson, theme, toggleTheme, onOpenCalculator, currentOperator, onLogout }) => {
  const [isNewStoreModalOpen, setNewStoreModalOpen] = useState(false);
  const [isDdaModalOpen, setDdaModalOpen] = useState(false);
  const [isPaymentRulesModalOpen, setPaymentRulesModalOpen] = useState(false);
  const [isCollaboratorsModalOpen, setCollaboratorsModalOpen] = useState(false);
  const [currentStoreForDda, setCurrentStoreForDda] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string; confirmVariant?: 'primary' | 'danger' }>({ isOpen: false, onConfirm: () => {}, title: '', message: '', confirmVariant: 'danger' });
  
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setLoadingProgress(0);
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 92) return prev;
          const increment = Math.random() * 15;
          return Math.min(prev + increment, 92);
        });
      }, 400);
    } else {
      setLoadingProgress(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleAddNewStore = (name: string, saldoInicial: number) => {
    const trimmedName = name.trim();
    if (!trimmedName || system.lojas[trimmedName]) return;
    const newStore: Loja = {
      saldoInicial,
      dda: [],
      folha: [],
      agend: [],
      transf: [],
      receb: [],
      data: new Date().toISOString().split('T')[0],
      history: { dda: [], folha: [], agend: [], transf: [], receb: [] }
    };
    onUpdateSystem({ ...system, lojas: { ...system.lojas, [trimmedName]: newStore } });
    setNewStoreModalOpen(false);
  };
  
  const handleUpdateLoja = (lojaName: string, updatedLoja: Loja) => {
    onUpdateSystem({ ...system, lojas: { ...system.lojas, [lojaName]: updatedLoja } });
  };

  const handleDeleteStore = (lojaName: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Excluir Loja',
      message: `Tem certeza que deseja excluir permanentemente a loja "${lojaName}" e todos os seus lançamentos?`,
      confirmVariant: 'danger',
      onConfirm: () => {
        const newLojas = { ...system.lojas };
        delete newLojas[lojaName];
        onUpdateSystem({ ...system, lojas: newLojas });
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleImportDda = async (lojaName: string, file: File) => {
    setIsLoading(`Analisando DDA para ${lojaName}...`);
    try {
        let ddaList: DDA[] = (file.type.startsWith('image/') || file.type === 'application/pdf') ? await processDdaImage(file) : await processExcelFile(file);
        const loja = system.lojas[lojaName];
        if (loja) handleUpdateLoja(lojaName, { ...loja, dda: [...loja.dda, ...ddaList] });
    } catch (error) {
        alert(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    } finally { setIsLoading(null); }
  };

  const handleImportSalary = async (lojaName: string, file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
    setIsLoading(isExcel ? `IA analisando Planilha de Salários...` : `IA analisando Relatório de Líquidos...`);
    
    try {
        const items = isExcel ? await processSalaryExcel(file) : await processSalaryReportImage(file);
        
        const normalize = (name: string) => 
            name.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
                .toUpperCase()
                .replace(/\s+/g, ' ');

        let globalColaboradores = [...(system.fornecedores || [])];
        let newColabsCount = 0;
        let pixRecoveredCount = 0;

        const agendamentos: Agendamento[] = items.map(item => {
            const normalizedImportName = normalize(item.fornecedor);
            const itemCpf = (item as any).cpf || '';
            
            let colab = globalColaboradores.find(f => normalize(f.name) === normalizedImportName);

            if (!colab) {
                colab = {
                    id: `colab-${Date.now()}-${Math.random()}`,
                    name: item.fornecedor.trim().toUpperCase(),
                    cpf: itemCpf,
                    chavePix: item.chavePix || ''
                };
                globalColaboradores.push(colab);
                newColabsCount++;
            } else if (itemCpf && !colab.cpf) {
                colab.cpf = itemCpf;
            }

            if (colab.chavePix) pixRecoveredCount++;

            return { 
              ...item, 
              tipo: 'PIX', 
              status: 'aberto' as const,
              cpf: itemCpf || colab.cpf || '',
              chavePix: item.chavePix || colab.chavePix || ''
            };
        });

        const loja = system.lojas[lojaName];
        if (loja) {
            onUpdateSystem({
                ...system,
                fornecedores: globalColaboradores,
                lojas: {
                    ...system.lojas,
                    [lojaName]: { ...loja, folha: [...(loja.folha || []), ...agendamentos] }
                }
            });
            
            let msg = `${agendamentos.length} colaboradores importados.`;
            if (pixRecoveredCount > 0) msg += `\n${pixRecoveredCount} chaves PIX recuperadas da memória.`;
            if (newColabsCount > 0) msg += `\n${newColabsCount} novos nomes cadastrados no Gerenciador.`;
            alert(msg);
        }
    } catch (error) {
        alert(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    } finally { setIsLoading(null); }
  };
  
  const handleTransferDdaItem = (index: number, destinationStore: string) => {
    if (!currentStoreForDda) return;
    const newSystem = JSON.parse(JSON.stringify(system));
    const sourceStore = newSystem.lojas[currentStoreForDda];
    
    if (sourceStore && sourceStore.dda && sourceStore.dda[index]) {
      const itemToMove = sourceStore.dda[index];
      sourceStore.dda.splice(index, 1);
      if (newSystem.lojas[destinationStore]) {
        if (!newSystem.lojas[destinationStore].dda) newSystem.lojas[destinationStore].dda = [];
        newSystem.lojas[destinationStore].dda.push(itemToMove);
        onUpdateSystem(newSystem);
        alert(`DDA transferido com sucesso para ${destinationStore}.`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-bpo-standard-light dark:bg-bpo-standard-dark bg-cover bg-fixed transition-colors duration-500">
       {isLoading && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-dark-panel p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-light-border dark:border-dark-border">
                  <div className="relative mb-6 mx-auto w-20 h-20">
                      <div className="absolute inset-0 border-4 border-light-primary/20 dark:border-dark-primary/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-light-primary dark:border-dark-primary border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-light-primary dark:text-dark-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                      </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-light-heading dark:text-dark-heading mb-2">Processando com IA</h3>
                  <p className="text-sm text-light-subtle dark:text-dark-subtle mb-6">{isLoading}</p>
                  
                  <div className="w-full bg-light-bg dark:bg-gray-800 rounded-full h-2 mb-2 overflow-hidden border border-light-border dark:border-dark-border">
                      <div 
                        className="bg-gradient-to-r from-light-primary to-light-accent h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${loadingProgress}%` }}
                      ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-light-subtle uppercase tracking-widest">
                      <span>Analisando</span>
                      <span>{Math.round(loadingProgress)}%</span>
                  </div>
              </div>
          </div>
      )}

      <Header 
        groupName={groupName} 
        onNewStore={() => setNewStoreModalOpen(true)} 
        onExportExcel={() => exportToExcel(system, groupName)} 
        onExportPdf={() => exportToPdf(system, groupName)} 
        onExportJson={onExportJson} // Backup Global do App.tsx
        onBackToGroups={onBackToGroups} 
        onNavigateToTransactions={onNavigateToTransactions} 
        onOpenCalculator={onOpenCalculator} 
        onOpenPaymentRules={() => setPaymentRulesModalOpen(true)} 
        onOpenCollaborators={() => setCollaboratorsModalOpen(true)}
        currentOperator={currentOperator}
        onLogout={onLogout}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto space-y-8">
          {Object.entries(system.lojas).map(([nome, loja]) => (
            <StoreCard key={nome} nome={nome} loja={loja} system={system} paymentRules={system.paymentRules || []} onUpdateLoja={(ul) => handleUpdateLoja(nome, ul)} onOpenDdaModal={() => { setCurrentStoreForDda(nome); setDdaModalOpen(true); }} onImportDda={(f) => handleImportDda(nome, f)} onImportSalary={(f) => handleImportSalary(nome, f)} onSystemUpdate={onUpdateSystem} onDeleteStore={() => handleDeleteStore(nome)} onOpenCollaborators={() => setCollaboratorsModalOpen(true)} />
          ))}
        </div>
      </main>
      
      <NewStoreModal isOpen={isNewStoreModalOpen} onClose={() => setNewStoreModalOpen(false)} onSave={handleAddNewStore} />
      <DdaModal 
        isOpen={isDdaModalOpen} 
        onClose={() => setDdaModalOpen(false)} 
        lojaNome={currentStoreForDda || ''} 
        ddaList={currentStoreForDda ? system.lojas[currentStoreForDda].dda : []} 
        lojasNomes={Object.keys(system.lojas)}
        paymentRules={system.paymentRules || []} 
        onUpdateDdaList={(nl) => currentStoreForDda && handleUpdateLoja(currentStoreForDda, { ...system.lojas[currentStoreForDda], dda: nl })} 
        onTransferItem={handleTransferDdaItem}
      />
      <PaymentRulesModal isOpen={isPaymentRulesModalOpen} onClose={() => setPaymentRulesModalOpen(false)} rules={system.paymentRules || []} onUpdateRules={(newRules) => onUpdateSystem({ ...system, paymentRules: newRules })} />
      <CollaboratorsModal isOpen={isCollaboratorsModalOpen} onClose={() => setCollaboratorsModalOpen(false)} system={system} onUpdateSystem={onUpdateSystem} />
      <ConfirmationModal isOpen={confirmState.isOpen} onClose={() => setConfirmState({...confirmState, isOpen: false})} onConfirm={confirmState.onConfirm} title={confirmState.title} message={confirmState.message} confirmVariant={confirmState.confirmVariant} />
    </div>
  );
};

export default AppView;
