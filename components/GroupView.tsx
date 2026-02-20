
import React, { useState, useRef, useEffect } from 'react';
import { Groups } from '../types';
import ConfirmationModal from './ui/ConfirmationModal';
import Modal from './ui/Modal';
import saveAs from 'file-saver';

interface GroupViewProps {
  groups: Groups;
  onSelectGroup: (name: string) => void;
  onUpdateGroups: (newGroups: Groups) => void;
  onBackupAll: () => void; // Prop do App.tsx
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenCalculator: () => void;
  currentOperator: string;
  onLogout: () => void;
}

const GroupView: React.FC<GroupViewProps> = ({ groups, onSelectGroup, onUpdateGroups, onBackupAll, theme, toggleTheme, onOpenCalculator, currentOperator, onLogout }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState('');
  const [confirmState, setConfirmState] = useState<{ 
    isOpen: boolean; 
    onConfirm: () => void; 
    title: string; 
    message: string; 
    confirmText?: string;
    confirmVariant?: 'primary' | 'danger' 
  }>({ 
    isOpen: false, 
    onConfirm: () => {}, 
    title: '', 
    message: '', 
    confirmText: 'Confirmar',
    confirmVariant: 'danger' 
  });
  const [editingGroup, setEditingGroup] = useState<{ oldName: string; newName: string } | null>(null);
  const [editError, setEditError] = useState('');
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newGroupFormId = "new-group-form";
  const editGroupFormId = "edit-group-form";
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddGroup = () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) {
      setError('Nome do grupo não pode ser vazio.');
      return;
    }
    if (groups[trimmedName]) {
      setError('Nome do grupo já existente.');
      return;
    }
    
    const newGroups = { ...groups, [trimmedName]: { lojas: {}, fornecedores: [], paymentRules: [] } };
    onUpdateGroups(newGroups);
    setNewGroupName('');
    setError('');
    setIsNewGroupModalOpen(false);
  };
  
  const handleSaveEditGroup = () => {
    if (!editingGroup) return;
    const { oldName, newName } = editingGroup;
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      setEditError('Nome do grupo não pode ser vazio.');
      return;
    }
    if (trimmedNewName !== oldName && groups[trimmedNewName]) {
      setEditError('Nome do grupo já existente.');
      return;
    }
    const newGroups = { ...groups };
    if (oldName !== trimmedNewName) {
        newGroups[trimmedNewName] = newGroups[oldName];
        delete newGroups[oldName];
    }
    onUpdateGroups(newGroups);
    setEditingGroup(null);
    setEditError('');
  };

  const handleDeleteGroup = (name: string) => {
    setConfirmState({
        isOpen: true,
        onConfirm: () => {
            const newGroups = { ...groups };
            delete newGroups[name];
            onUpdateGroups(newGroups);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        },
        title: 'Excluir Grupo',
        message: `Tem certeza que deseja excluir o grupo "${name}"? Esta ação não pode ser desfeita.`,
        confirmText: 'Excluir',
        confirmVariant: 'danger',
    });
  };

  const openNewGroupModal = () => {
    setNewGroupName('');
    setError('');
    setIsNewGroupModalOpen(true);
  }

  const handleRestoreClick = () => {
      fileInputRef.current?.click();
      setIsActionsMenuOpen(false);
  };

  const handleFileRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result as string;
              const parsedData = JSON.parse(text);
              if (typeof parsedData === 'object' && parsedData !== null) {
                   setConfirmState({
                      isOpen: true,
                      title: 'Restaurar Sistema Completo',
                      message: 'ATENÇÃO: Esta ação substituirá TODOS os dados de todos os seus grupos e lojas atuais pelas informações contidas no backup. Deseja prosseguir?',
                      onConfirm: () => {
                          onUpdateGroups(parsedData);
                          setConfirmState(prev => ({ ...prev, isOpen: false }));
                          alert('Sistema restaurado com sucesso! Todos os grupos foram atualizados.');
                      },
                      confirmText: 'Restaurar Tudo',
                      confirmVariant: 'primary'
                  });
              } else {
                  throw new Error('Arquivo de backup inválido.');
              }
          } catch (err) {
              alert('Erro ao restaurar backup. Verifique se o arquivo está correto.');
          }
      };
      reader.readAsText(file);
      if(event.target) event.target.value = '';
  };

  const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  const groupCard = (name: string) => (
    <div key={name} className="relative bg-light-panel dark:bg-dark-panel backdrop-blur-panel p-2 rounded-xl shadow-md border border-light-border dark:border-dark-border flex flex-col justify-between group transition-all duration-300 hover:shadow-xl hover:border-light-primary/50 dark:hover:border-dark-primary/50 hover:-translate-y-0.5 w-36 shrink-0 h-28">
      <div className="absolute top-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingGroup({ oldName: name, newName: name }); setEditError(''); }}
            className="p-1 rounded-lg hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 text-light-subtle dark:text-dark-subtle transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(name); }}
            className="p-1 rounded-lg hover:bg-light-danger/10 dark:hover:bg-dark-danger/20 text-light-subtle dark:text-dark-subtle hover:text-light-danger dark:hover:text-dark-danger transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
      </div>
      <div onClick={() => onSelectGroup(name)} className="flex flex-col flex-grow justify-center items-center text-center cursor-pointer p-0.5">
          <div className="w-8 h-8 bg-light-primary/10 dark:bg-dark-primary/20 rounded-lg flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110 shadow-sm">
              <span className="text-xs font-black text-light-primary dark:text-dark-primary">{name.charAt(0).toUpperCase()}</span>
          </div>
          <h3 className="text-[11px] font-extrabold mb-0.5 text-light-heading dark:text-dark-heading break-all tracking-tight leading-none truncate w-full px-1">{name}</h3>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-light-accent dark:bg-dark-accent"></span>
            <p className="text-[9px] font-bold text-light-subtle dark:text-dark-subtle uppercase tracking-widest">
              {Object.keys(groups[name].lojas).length} {Object.keys(groups[name].lojas).length === 1 ? 'loja' : 'lojas'}
            </p>
          </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bpo-home-light dark:bg-bpo-home-dark bg-cover bg-fixed text-light-text dark:text-dark-text p-6 sm:p-10 lg:p-12 transition-all duration-500">
      <input type="file" ref={fileInputRef} onChange={handleFileRestore} accept=".json" className="hidden" />
      
      <div className="container mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center gap-6 mb-12 bg-light-panel dark:bg-dark-panel p-6 rounded-[2.5rem] border border-light-border dark:border-dark-border backdrop-blur-md shadow-2xl">
          <div className="mr-4">
            <h1 className="text-3xl font-black text-light-heading dark:text-dark-heading tracking-tight mb-0.5 drop-shadow-md leading-none">Meus Grupos</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-light-subtle dark:text-dark-subtle">Gestão BPO Financeiro</p>
          </div>

          <div className="flex items-center gap-3">
              <button
                  onClick={openNewGroupModal}
                  className="px-6 py-2.5 rounded-2xl font-bold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 transition-all flex items-center justify-center gap-2.5 shadow-lg active:scale-95 shrink-0 text-sm"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Novo Grupo
              </button>
              <div className="relative" ref={actionsMenuRef}>
                  <button onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)} className="w-10 h-10 rounded-xl bg-light-panel dark:bg-dark-panel backdrop-blur-panel border border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border transition-all flex items-center justify-center text-light-subtle shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
                  </button>
                  {isActionsMenuOpen && (
                    <div className="absolute left-0 mt-3 w-64 bg-light-panel dark:bg-dark-panel backdrop-blur-panel rounded-2xl shadow-2xl z-50 border border-light-border dark:border-dark-border p-2">
                      <button onClick={() => { setIsActionsMenuOpen(false); onBackupAll(); }} className="w-full text-left px-5 py-3 text-xs font-bold text-light-text dark:text-dark-text hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition rounded-xl flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-light-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        Exportar Sistema Completo
                      </button>
                      <button onClick={handleRestoreClick} className="w-full text-left px-5 py-3 text-xs font-bold text-light-text dark:text-dark-text hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition rounded-xl flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-light-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Restaurar Backup Global
                      </button>
                    </div>
                  )}
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-grow min-w-0">
              {sortedGroupNames.map(name => groupCard(name))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
             <div className="flex items-center gap-3 mr-2 bg-light-bg/50 dark:bg-dark-bg/50 rounded-xl px-3 py-1.5 border border-light-border dark:border-dark-border">
                <div className="flex flex-col text-right">
                    <span className="text-[9px] font-bold uppercase text-light-subtle dark:text-dark-subtle">Operador</span>
                    <span className="text-xs font-black text-light-heading dark:text-dark-heading">{currentOperator}</span>
                </div>
                <button onClick={onLogout} title="Sair do Operador" className="w-6 h-6 rounded-full bg-light-danger/10 text-light-danger flex items-center justify-center hover:bg-light-danger hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
             </div>
              <button onClick={onOpenCalculator} className="w-10 h-10 rounded-xl bg-light-panel dark:bg-dark-panel backdrop-blur-panel border border-light-border dark:border-dark-border hover:border-light-primary/50 dark:hover:border-dark-primary/50 flex items-center justify-center transition shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-5 w-5 text-light-subtle dark:text-dark-subtle">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 3h.008v.008H8.25v-.008Zm0 3h.008v.008H8.25v-.008Zm3-6h.008v.008H11.25v-.008Zm0 3h.008v.008H11.25v-.008Zm0 3h.008v.008H11.25v-.008Zm3-6h.008v.008H14.25v-.008Zm0 3h.008v.008H14.25v-.008ZM12 6.75h2.25M12 9.75h2.25M12 12.75h2.25M12 15.75h2.25M4.5 21V5.25A2.25 2.25 0 0 1 6.75 3h10.5A2.25 2.25 0 0 1 19.5 5.25V21M4.5 21H19.5" />
                  </svg>
              </button>
              <button onClick={toggleTheme} className="w-10 h-10 rounded-xl bg-light-panel dark:bg-dark-panel backdrop-blur-panel border border-light-border dark:border-dark-border hover:border-light-primary/50 dark:hover:border-dark-primary/50 flex items-center justify-center transition shadow-md">
                  {theme === 'light' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-subtle dark:text-dark-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-subtle dark:text-dark-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
              </button>
          </div>
        </header>

        <main>
          {/* Seção 'Ambiente Pronto' removida conforme solicitado */}
        </main>
      </div>

      <Modal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        title="Novo Ambiente de Gestão"
        footer={
            <>
                <button onClick={() => setIsNewGroupModalOpen(false)} className="px-6 py-2.5 text-sm rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-light-subtle hover:opacity-80 transition-all">Cancelar</button>
                <button type="submit" form={newGroupFormId} className="px-6 py-2.5 text-sm rounded-xl font-bold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 shadow-lg transition-all">Criar Grupo</button>
            </>
        }
      >
        <form id={newGroupFormId} onSubmit={(e) => { e.preventDefault(); handleAddGroup(); }} className="space-y-5">
            <div>
                <label htmlFor="newGroupName" className="block text-xs font-black uppercase tracking-widest text-light-subtle dark:text-dark-subtle mb-2">Identificação do Grupo</label>
                <input
                    id="newGroupName"
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex: Franquias Centro"
                    required
                    autoFocus
                    className="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-light-primary font-bold text-lg"
                />
            </div>
            {error && <p className="text-sm font-bold text-red-500">{error}</p>}
        </form>
      </Modal>

      <Modal
        isOpen={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        title="Renomear Ambiente"
        footer={
            <>
                <button onClick={() => setEditingGroup(null)} className="px-6 py-2.5 text-sm rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-light-subtle hover:opacity-80 transition-all">Cancelar</button>
                <button type="submit" form={editGroupFormId} className="px-6 py-2.5 text-sm rounded-xl font-bold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 shadow-lg transition-all">Atualizar Nome</button>
            </>
        }
      >
        <form id={editGroupFormId} onSubmit={(e) => { e.preventDefault(); handleSaveEditGroup(); }} className="space-y-5">
            <div>
                <label htmlFor="groupNameEdit" className="block text-xs font-black uppercase tracking-widest text-light-subtle dark:text-dark-subtle mb-2">Novo Nome do Grupo</label>
                <input
                    id="groupNameEdit"
                    type="text"
                    value={editingGroup?.newName || ''}
                    onChange={(e) => editingGroup && setEditingGroup({ ...editingGroup, newName: e.target.value })}
                    required
                    autoFocus
                    className="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-light-primary font-bold text-lg"
                />
            </div>
            {editError && <p className="text-sm font-bold text-red-500">{editError}</p>}
        </form>
      </Modal>

      <ConfirmationModal
          isOpen={confirmState.isOpen}
          onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText || (confirmState.confirmVariant === 'danger' ? 'Excluir' : 'Confirmar')}
          confirmVariant={confirmState.confirmVariant}
      />
    </div>
  );
};

export default GroupView;
