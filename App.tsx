
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Group, Groups, Loja, AggregatedItem, Operator } from './types';
import GroupView from './components/GroupView';
import AppView from './components/AppView';
import TransactionsView from './components/TransactionsView';
import Calculator from './components/ui/Calculator';
import OperatorSelection from './components/OperatorSelection';
import ConfirmationModal from './components/ui/ConfirmationModal';
import saveAs from 'file-saver';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('theme');
      return (saved as 'light' | 'dark') || 'dark';
    } catch {
      return 'dark';
    }
  });
  
  // Data State
  const [operators, setOperators] = useState<Operator[]>([]);
  const [groups, setGroups] = useState<Groups>({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasCheckedDailyClear, setHasCheckedDailyClear] = useState(false);

  // Operator State
  const [currentOperator, setCurrentOperator] = useState<string | null>(null);
  const [currentOperatorId, setCurrentOperatorId] = useState<string | null>(null);
  const [operatorToDelete, setOperatorToDelete] = useState<string | null>(null);
  
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'groups' | 'app' | 'transactions'>('groups');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const [confirmState, setConfirmState] = useState<{ 
    isOpen: boolean; 
    onConfirm: () => void; 
    onClose?: () => void;
    title: string; 
    message: string; 
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'danger' 
  }>({ 
    isOpen: false, 
    onConfirm: () => {}, 
    title: '', 
    message: '', 
    confirmVariant: 'danger' 
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Fetch Operators
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const { data: opsData, error: opsError } = await supabase
          .from('operators')
          .select('id, name, pin, email')
          .order('name');
        
        if (opsError) throw opsError;
        if (opsData) {
            setOperators(opsData as Operator[]);
        }
      } catch (error) {
        console.error("Supabase operators load error:", error);
        const localOps = localStorage.getItem('bpoOperators');
        if (localOps) {
            try {
                const parsed = JSON.parse(localOps);
                if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
                    setOperators(parsed.map(name => ({ 
                        id: `local-${name.trim().replace(/\s+/g, '_').toLowerCase()}`, 
                        name, 
                        pin: '0000' 
                    })));
                } else {
                    setOperators(parsed);
                }
            } catch {}
        }
      }
    };
    fetchOperators();
  }, []);

  // 2. Fetch System Data
  useEffect(() => {
    const loadSystemData = async () => {
        if (!currentOperatorId) {
            setGroups({});
            setHasCheckedDailyClear(false);
            return;
        }

        setIsDataLoaded(false);
        let loadedData: Groups | null = null;
        let source = 'none';

        try {
            const { data: sysData, error: sysError } = await supabase
              .from('bpo_system')
              .select('data')
              .eq('id', currentOperatorId) 
              .single();

            if (sysData && sysData.data && Object.keys(sysData.data).length > 0) {
                loadedData = sysData.data;
                source = 'cloud';
            }
        } catch (error) {
            console.error("Supabase load error:", error);
        }

        if (!loadedData || Object.keys(loadedData).length === 0) {
             const localSpecific = localStorage.getItem(`bpo_system_${currentOperatorId}`);
             if (localSpecific) {
                 try { 
                     loadedData = JSON.parse(localSpecific); 
                     source = 'local_specific';
                 } catch {}
             }

             if (!loadedData) {
                 const globalLegacy = localStorage.getItem('bpo_system_data') || localStorage.getItem('bpoGroups');
                 if (globalLegacy) {
                     try { 
                         loadedData = JSON.parse(globalLegacy); 
                         source = 'legacy_migration';
                         showToast('Dados antigos recuperados e migrados!', 'info');
                     } catch {}
                 }
             }
        }

        console.log(`Dados carregados via: ${source}`);
        setGroups(loadedData || {});
        setIsDataLoaded(true);
    };

    if (currentOperatorId) {
        loadSystemData();
    }
  }, [currentOperatorId]);

  // 3. Daily Clear Check (Limpeza com Confirmação)
  useEffect(() => {
    if (isDataLoaded && currentOperatorId && !hasCheckedDailyClear) {
        
        if (Object.keys(groups).length === 0) {
            setHasCheckedDailyClear(true);
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const formattedToday = new Date().toLocaleDateString('pt-BR');
        const lastCheckKey = `last_daily_check_${currentOperatorId}`;
        const lastCheckDate = localStorage.getItem(lastCheckKey);

        if (lastCheckDate !== today) {
            const hasAnyData = Object.values(groups).some((group: Group) => 
                Object.values(group.lojas).some((loja: Loja) => 
                    loja.dda.length > 0 || 
                    (loja.folha || []).length > 0 || 
                    loja.agend.length > 0 || 
                    loja.transf.length > 0
                )
            );

            if (hasAnyData) {
                setConfirmState({
                    isOpen: true,
                    title: 'Início de Novo Dia',
                    message: `Identificamos que hoje é ${formattedToday}. Deseja limpar os lançamentos de TODAS as lojas para iniciar o dia zerado? (Os dados atuais serão movidos para o histórico)`,
                    confirmText: 'Sim, Excluir Tudo',
                    cancelText: 'Não, Manter',
                    confirmVariant: 'danger',
                    onConfirm: () => {
                        handleGlobalClear();
                        setConfirmState(prev => ({ ...prev, isOpen: false }));
                        localStorage.setItem(lastCheckKey, today);
                    },
                    onClose: () => {
                        setConfirmState(prev => ({ ...prev, isOpen: false }));
                        localStorage.setItem(lastCheckKey, today);
                    }
                });
            } else {
                localStorage.setItem(lastCheckKey, today);
            }
        }
        setHasCheckedDailyClear(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoaded, currentOperatorId, hasCheckedDailyClear]);

  const handleGlobalClear = () => {
      setGroups(prevGroups => {
          // CLONAGEM DO OBJETO PRINCIPAL
          // Usar spread (...) preserva as chaves e sua ordem original
          const newGroups = { ...prevGroups };

          Object.keys(newGroups).forEach(groupKey => {
              const oldGroup = newGroups[groupKey];
              
              // CLONAGEM DO OBJETO DE LOJAS
              // IMPORTANTE: Clonamos oldGroup.lojas para garantir que as chaves fiquem exatamente onde estão.
              // Não criamos um objeto vazio para reinserir.
              const newLojas = { ...oldGroup.lojas };

              if (newLojas) {
                  // Iteramos sobre as chaves existentes APENAS para atualizar os valores (limpar arrays)
                  // A estrutura do objeto 'newLojas' não é alterada (nenhuma chave é removida ou readicionada)
                  Object.keys(newLojas).forEach(lojaKey => {
                      const oldLoja = newLojas[lojaKey];
                      
                      // Prepara arrays de histórico com segurança
                      const historyDda = [...(oldLoja.history?.dda || [])];
                      const historyFolha = [...(oldLoja.history?.folha || [])];
                      const historyAgend = [...(oldLoja.history?.agend || [])];
                      const historyTransf = [...(oldLoja.history?.transf || [])];
                      const historyReceb = [...(oldLoja.history?.receb || [])];

                      // Adiciona itens atuais ao histórico
                      if (oldLoja.dda) historyDda.push(...oldLoja.dda);
                      if (oldLoja.folha) historyFolha.push(...oldLoja.folha);
                      if (oldLoja.agend) historyAgend.push(...oldLoja.agend);
                      if (oldLoja.transf) historyTransf.push(...oldLoja.transf);
                      if (oldLoja.receb) historyReceb.push(...oldLoja.receb);

                      // Atualiza a loja 'in place' dentro do objeto clonado
                      // Isso mantém a referência da chave na mesma posição de memória/ordem
                      newLojas[lojaKey] = {
                          ...oldLoja,
                          dda: [],
                          folha: [],
                          agend: [],
                          transf: [],
                          receb: [],
                          history: {
                              dda: historyDda,
                              folha: historyFolha,
                              agend: historyAgend,
                              transf: historyTransf,
                              receb: historyReceb
                          }
                      };
                  });
              }
              
              // Atualiza o grupo com o objeto de lojas modificado (mas com ordem preservada)
              newGroups[groupKey] = {
                  ...oldGroup,
                  lojas: newLojas
              };
          });

          return newGroups;
      });
      showToast('Novo dia iniciado. Lançamentos movidos para o histórico.');
  };

  // 4. Add/Update/Delete Operator
  const handleAddOperator = async (name: string, pin: string, email: string) => {
      if (!operators.some(op => op.name === name)) {
          const tempId = `temp-${Date.now()}`;
          const newOp: Operator = { id: tempId, name, pin, email };
          setOperators(prev => [...prev, newOp]);
          
          const { data, error } = await supabase
            .from('operators')
            .insert([{ name, pin, email }])
            .select();
            
          if (error) {
              const updatedOps = [...operators, newOp];
              localStorage.setItem('bpoOperators', JSON.stringify(updatedOps));
          } else if (data) {
              const realOperator = data[0] as Operator;
              setOperators(prev => prev.map(op => op.id === tempId ? realOperator : op));
              setCurrentOperator(realOperator.name);
              setCurrentOperatorId(realOperator.id);
              showToast(`Bem-vindo, ${name}!`);
          }
      } else {
          alert("Já existe um operador com este nome.");
      }
  };

  const handleUpdateOperator = async (id: string, name: string, pin: string, email: string) => {
      const updatedOperators = operators.map(op => 
          op.id === id ? { ...op, name, pin, email } : op
      );
      setOperators(updatedOperators);
      const { error } = await supabase.from('operators').update({ name, pin, email }).eq('id', id);
      if (error) {
          localStorage.setItem('bpoOperators', JSON.stringify(updatedOperators));
          showToast('Atualizado localmente (erro na nuvem)', 'info');
      } else {
          showToast('Operador atualizado com sucesso!');
      }
  };

  const handleDeleteOperatorRequest = (id: string) => {
      setOperatorToDelete(id);
      setConfirmState({
          isOpen: true,
          title: 'Excluir Operador',
          message: 'Tem certeza que deseja excluir este operador?',
          confirmText: 'Excluir',
          confirmVariant: 'danger',
          onConfirm: () => confirmDeleteOperator(id),
          onClose: () => setOperatorToDelete(null)
      });
  };

  const confirmDeleteOperator = async (id: string) => {
      const previousOps = [...operators];
      setOperators(prev => prev.filter(op => op.id !== id));
      setOperatorToDelete(null); 
      setConfirmState(prev => ({ ...prev, isOpen: false }));

      const { error } = await supabase.from('operators').delete().eq('id', id);
      if (error) {
          setOperators(previousOps); 
          alert("Erro ao excluir operador do banco.");
      }
  };

  // 5. Sync
  useEffect(() => {
    if (!isDataLoaded || !currentOperatorId) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setIsSyncing(true);
    saveTimeoutRef.current = setTimeout(async () => {
        try {
            localStorage.setItem(`bpo_system_${currentOperatorId}`, JSON.stringify(groups));
            const { error } = await supabase
                .from('bpo_system')
                .upsert({ 
                    id: currentOperatorId, 
                    data: groups,
                    last_updated_by: currentOperator || 'system',
                    updated_at: new Date().toISOString()
                });
            if (error) console.error("Cloud save failed", error);
        } catch (e) {
            console.error("Auto-save exception:", e);
        } finally {
            setIsSyncing(false);
        }
    }, 2000); 

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [groups, isDataLoaded, currentOperatorId, currentOperator]);

  // Auto Backup
  useEffect(() => {
    const checkAutoBackup = () => {
      if (Object.keys(groups).length === 0) return;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastBackupKey = `lastAutoBackup_${currentOperatorId || 'anon'}`;
      const lastBackupLog = JSON.parse(localStorage.getItem(lastBackupKey) || '{}');
      const triggers = [{ h: 11, m: 0, label: '11h00' }, { h: 11, m: 59, label: '11h59' }, { h: 16, m: 59, label: '16h59' }, { h: 17, m: 59, label: '17h59' }];
      const activeTrigger = triggers.find(t => t.h === now.getHours() && t.m === now.getMinutes());

      if (activeTrigger) {
        const logKey = `${today}_${activeTrigger.label}`;
        if (!lastBackupLog[logKey]) {
            try {
                const dataStr = JSON.stringify(groups, null, 2);
                const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
                saveAs(blob, `BPO_AutoBackup_${currentOperator}_${activeTrigger.label}_${today}.json`);
                lastBackupLog[logKey] = true;
                localStorage.setItem(lastBackupKey, JSON.stringify(lastBackupLog));
                showToast(`Backup automático das ${activeTrigger.label} realizado!`, 'info');
            } catch (e) { console.error("Backup auto error", e); }
        }
      }
    };
    const timer = setInterval(checkAutoBackup, 60000);
    return () => clearInterval(timer);
  }, [groups, currentOperator, currentOperatorId]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleUpdateCurrentGroup = (updatedSystem: Group) => {
    if (currentGroup) setGroups(prev => ({ ...prev, [currentGroup]: updatedSystem }));
  };

  const handleOperatorLogin = (name: string) => {
      const op = operators.find(o => o.name === name);
      if (op) {
          setCurrentOperator(name);
          setCurrentOperatorId(op.id);
      }
  };

  const handleOperatorLogout = () => {
      setCurrentOperator(null);
      setCurrentOperatorId(null);
      setCurrentGroup(null);
      setCurrentView('groups');
      setGroups({});
      setHasCheckedDailyClear(false);
  };

  const handleExportAllGroupsJson = () => {
    if (Object.keys(groups).length === 0) {
      alert("Não há dados cadastrados para fazer backup.");
      return;
    }
    try {
      const dataStr = JSON.stringify(groups, null, 2);
      const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
      saveAs(blob, `BPO_Backup_${currentOperator}_${new Date().toISOString().split('T')[0]}.json`);
      showToast("Backup completo gerado com sucesso!");
    } catch (error) {
      alert("Erro ao criar backup global.");
    }
  };

  const aggregatedItems = useMemo(() => {
    if (!currentGroup || !groups[currentGroup]) return [];
    const system = groups[currentGroup];
    const items: AggregatedItem[] = [];
    try {
      if (!system.lojas) return [];
      Object.entries(system.lojas).forEach(([lojaNome, loja]: [string, Loja]) => {
          if (!loja) return;
          (loja.dda || []).forEach(data => items.push({ lojaNome, type: 'dda', data }));
          (loja.folha || []).forEach(data => items.push({ lojaNome, type: 'folha', data }));
          (loja.agend || []).forEach(data => items.push({ lojaNome, type: 'agend', data }));
          (loja.transf || []).forEach(data => items.push({ lojaNome, type: 'transf', data }));
          (loja.receb || []).forEach(data => items.push({ lojaNome, type: 'receb', data }));
          if (loja.history) {
            (loja.history.dda || []).forEach(data => items.push({ lojaNome, type: 'dda', data }));
            // ... repeat for other history items if needed for view
          }
      });
    } catch (e) { console.error("Error aggregating items", e); }
    return items;
  }, [groups, currentGroup]);
  
  if (!currentOperator) {
      return (
          <>
            <OperatorSelection 
                operators={operators}
                onSelectOperator={handleOperatorLogin}
                onAddOperator={handleAddOperator}
                onDeleteOperator={handleDeleteOperatorRequest}
                onUpdateOperator={handleUpdateOperator}
            />
            {toast && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
                  <div className={`bg-light-primary dark:bg-dark-primary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md`}>
                    <span className="text-sm font-bold">{toast.message}</span>
                  </div>
                </div>
            )}
            <ConfirmationModal 
                isOpen={confirmState.isOpen} 
                onClose={() => { if (confirmState.onClose) confirmState.onClose(); else setConfirmState(prev => ({ ...prev, isOpen: false })); }}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                confirmVariant={confirmState.confirmVariant}
            />
          </>
      );
  }

  if (currentOperator && !isDataLoaded) {
      return (
          <div className="min-h-screen bg-bpo-standard-dark flex flex-col items-center justify-center text-white gap-4">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="animate-pulse font-bold text-lg">Carregando ambiente de {currentOperator}...</p>
          </div>
      );
  }

  const renderView = () => {
    if (currentView === 'groups' || !currentGroup || !groups[currentGroup]) {
      return (
        <GroupView
          groups={groups}
          onSelectGroup={(name) => { setCurrentGroup(name); setCurrentView('app'); }}
          onUpdateGroups={setGroups}
          onBackupAll={handleExportAllGroupsJson}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          currentOperator={currentOperator}
          onLogout={handleOperatorLogout}
        />
      );
    }
    const system = groups[currentGroup] || { lojas: {}, fornecedores: [], paymentRules: [] };
    if (currentView === 'app') {
      return (
        <AppView 
          system={system} 
          groupName={currentGroup}
          onBackToGroups={() => { setCurrentGroup(null); setCurrentView('groups'); }}
          onNavigateToTransactions={() => setCurrentView('transactions')}
          onUpdateSystem={handleUpdateCurrentGroup}
          onExportJson={handleExportAllGroupsJson}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          currentOperator={currentOperator}
          onLogout={handleOperatorLogout}
        />
      );
    }
    if (currentView === 'transactions') {
      return (
          <TransactionsView
              groupName={currentGroup}
              allItems={aggregatedItems}
              allLojas={system.lojas}
              onBack={() => setCurrentView('app')}
              theme={theme}
              toggleTheme={toggleTheme}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
          />
      );
    }
    return null;
  };
  
  return (
    <>
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <div className={`${toast.type === 'info' ? 'bg-light-primary dark:bg-dark-primary' : 'bg-green-600'} text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md`}>
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        </div>
      )}
      <div className="fixed bottom-4 right-4 z-50">
          {isSyncing ? (
              <div className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg"><div className="w-2 h-2 bg-white rounded-full animate-ping"></div>Salvando...</div>
          ) : (
              <div className="bg-green-600/80 text-white text-[10px] px-2 py-1 rounded-full shadow-lg opacity-50 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white"></span>Online</div>
          )}
      </div>
      {renderView()}
      <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      <ConfirmationModal 
          isOpen={confirmState.isOpen} 
          onClose={() => { if (confirmState.onClose) confirmState.onClose(); else setConfirmState(prev => ({ ...prev, isOpen: false })); }}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          confirmVariant={confirmState.confirmVariant}
      />
    </>
  );
};

export default App;
