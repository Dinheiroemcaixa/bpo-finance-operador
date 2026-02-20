
import React, { useState } from 'react';
import { Operator } from '../types';

interface OperatorSelectionProps {
  operators: Operator[];
  onSelectOperator: (name: string) => void;
  onAddOperator: (name: string, pin: string, email: string) => void;
  onDeleteOperator: (id: string) => void;
  onUpdateOperator?: (id: string, name: string, pin: string, email: string) => void;
}

const OperatorSelection: React.FC<OperatorSelectionProps> = ({ operators, onSelectOperator, onAddOperator, onDeleteOperator, onUpdateOperator }) => {
  // Estados para Login
  const [selectedOp, setSelectedOp] = useState<Operator | null>(null);
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Estados para Cadastro
  const [isAdding, setIsAdding] = useState(false);
  const [newOperatorName, setNewOperatorName] = useState('');
  const [newOperatorPin, setNewOperatorPin] = useState('');
  const [newOperatorEmail, setNewOperatorEmail] = useState('');

  // Estados para Edição
  const [editingOp, setEditingOp] = useState<Operator | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPin, setEditPin] = useState('');
  const [isForcedUpdate, setIsForcedUpdate] = useState(false); // Novo estado para controlar fluxo obrigatório

  // Estados para Exclusão (Senha Mestra)
  const [operatorToDeleteId, setOperatorToDeleteId] = useState<string | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // SENHA MESTRA DO CRIADOR (Você pode alterar este valor aqui)
  const MASTER_PIN = '9999';

  const getInitials = (name: string) => {
    return name
        .split(' ')
        .filter(n => n.length > 0)
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase();
  };

  const handleLoginClick = (op: Operator) => {
      setSelectedOp(op);
      setLoginPin('');
      setLoginError('');
  };

  const verifyLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedOp) return;

      const isMasterAccess = loginPin === MASTER_PIN;

      // Verifica se é a senha do usuário OU a senha mestra
      if (loginPin === selectedOp.pin || isMasterAccess) {
          
          // VERIFICAÇÃO DE CADASTRO OBRIGATÓRIO (E-MAIL)
          // Só executa se NÃO for acesso via Senha Mestra
          if (!isMasterAccess && (!selectedOp.email || selectedOp.email.trim() === '')) {
              // Se não tiver e-mail, força a atualização
              setLoginError(''); // Limpa erro de senha
              setEditName(selectedOp.name);
              setEditEmail('');
              setEditPin(selectedOp.pin);
              setEditingOp(selectedOp);
              setIsForcedUpdate(true); // Marca como forçado
              return;
          }

          onSelectOperator(selectedOp.name);
          setSelectedOp(null);
      } else {
          setLoginError('Senha incorreta. Tente novamente.');
          setLoginPin('');
      }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOperatorName.trim() && newOperatorPin.length === 4 && newOperatorEmail.trim()) {
      onAddOperator(newOperatorName.trim(), newOperatorPin, newOperatorEmail.trim());
      setNewOperatorName('');
      setNewOperatorPin('');
      setNewOperatorEmail('');
      setIsAdding(false);
    }
  };

  // Inicia o fluxo de exclusão
  const handleDeleteClick = (id: string) => {
      setOperatorToDeleteId(id);
      setDeletePin('');
      setDeleteError('');
  };

  // Verifica a senha mestra para exclusão
  const verifyDeleteAuth = (e: React.FormEvent) => {
      e.preventDefault();
      if (deletePin === MASTER_PIN) {
          if (operatorToDeleteId) {
              onDeleteOperator(operatorToDeleteId);
          }
          setOperatorToDeleteId(null);
          setDeletePin('');
      } else {
          setDeleteError('Acesso Negado. Senha Mestra incorreta.');
          setDeletePin('');
      }
  };

  // Inicia edição manual (clique no lápis)
  const handleEditClick = (op: Operator) => {
      setEditingOp(op);
      setEditName(op.name);
      setEditEmail(op.email || '');
      setEditPin(op.pin);
      setIsForcedUpdate(false); // Edição voluntária
  };

  // Salva edição
  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingOp && onUpdateOperator && editName.trim() && editEmail.trim() && editPin.length === 4) {
          onUpdateOperator(editingOp.id, editName.trim(), editPin, editEmail.trim());
          
          // Se foi uma atualização forçada durante o login, atualizamos o objeto local
          // para que o usuário possa clicar em "Entrar" novamente e ter sucesso imediato.
          if (isForcedUpdate && selectedOp && selectedOp.id === editingOp.id) {
              setSelectedOp({
                  ...selectedOp,
                  name: editName.trim(),
                  pin: editPin,
                  email: editEmail.trim()
              });
          }

          setEditingOp(null);
          setIsForcedUpdate(false);
      }
  };

  return (
    <div className="min-h-screen bg-bpo-home-light dark:bg-bpo-home-dark bg-cover bg-fixed flex items-center justify-center p-4 transition-colors duration-500">
      <div className="w-full max-w-4xl">
        <div className="bg-light-panel dark:bg-dark-panel backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-light-border dark:border-dark-border p-8 md:p-12 animate-fade-in-scale">
            
            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-black text-light-heading dark:text-dark-heading mb-2">Quem está operando?</h1>
                <p className="text-sm font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-widest">
                    {operators.length > 0 ? "Selecione seu perfil para entrar" : "Crie um novo perfil para começar"}
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {operators.map((op) => (
                    <div key={op.id} className="relative group hover:z-30">
                        <button
                            onClick={() => handleLoginClick(op)}
                            className="w-full aspect-square rounded-2xl bg-light-bg dark:bg-dark-bg border-2 border-transparent hover:border-light-primary dark:hover:border-dark-primary hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 p-4 group-hover:-translate-y-1 relative z-0 overflow-hidden"
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent flex items-center justify-center text-white font-black text-2xl shadow-inner relative overflow-hidden">
                                {/* Exibe a inicial como base */}
                                <span className="z-0 tracking-tighter">{getInitials(op.name)}</span>
                                
                                {/* Tenta carregar a imagem do e-mail por cima */}
                                {op.email && (
                                    <img 
                                        src={`https://unavatar.io/${op.email}?size=400&fallback=false`} 
                                        alt={op.name}
                                        className="absolute inset-0 w-full h-full object-cover z-10 opacity-0 transition-opacity duration-300"
                                        onLoad={(e) => (e.target as HTMLImageElement).style.opacity = '1'}
                                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                    />
                                )}
                            </div>
                            <span className="font-bold text-light-heading dark:text-dark-heading truncate w-full text-center text-sm">{op.name}</span>
                            <span className="text-[10px] font-bold text-light-primary dark:text-dark-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2">Entrar</span>
                        </button>
                        
                        {/* Botões de Ação (Editar e Excluir) */}
                        <div className="absolute top-2 right-2 flex gap-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onUpdateOperator && (
                                <button
                                    type="button"
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation(); 
                                        handleEditClick(op); 
                                    }}
                                    className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-all bg-white/50 dark:bg-black/50 backdrop-blur-sm"
                                    title={`Editar ${op.name}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                                    </svg>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation(); 
                                    handleDeleteClick(op.id); 
                                }}
                                className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-light-danger dark:hover:text-dark-danger hover:bg-light-danger/10 dark:hover:bg-dark-danger/10 transition-all bg-white/50 dark:bg-black/50 backdrop-blur-sm"
                                title={`Remover ${op.name}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full aspect-square rounded-2xl border-2 border-dashed border-light-subtle/30 dark:border-dark-subtle/30 hover:border-light-primary dark:hover:border-dark-primary hover:bg-light-primary/5 dark:hover:bg-dark-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-light-subtle dark:text-dark-subtle hover:text-light-primary dark:hover:text-dark-primary"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <span className="text-xs font-bold uppercase tracking-wider">Novo Cadastro</span>
                </button>
            </div>

            {/* MODAL DE LOGIN (PIN DO USUÁRIO) */}
            {selectedOp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedOp(null)}>
                    <div className="bg-light-panel dark:bg-dark-panel p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border border-light-border dark:border-dark-border transform scale-100" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent flex items-center justify-center text-white font-black text-3xl shadow-lg relative overflow-hidden">
                                <span className="z-0 tracking-tighter">{getInitials(selectedOp.name)}</span>
                                {selectedOp.email && (
                                    <img 
                                        src={`https://unavatar.io/${selectedOp.email}?size=400&fallback=false`} 
                                        alt={selectedOp.name}
                                        className="absolute inset-0 w-full h-full object-cover z-10"
                                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                    />
                                )}
                            </div>
                            <h3 className="text-xl font-black text-light-heading dark:text-dark-heading">Olá, {selectedOp.name}</h3>
                            <p className="text-xs text-light-subtle dark:text-dark-subtle font-medium mt-1">Digite sua senha de acesso</p>
                        </div>
                        
                        <form onSubmit={verifyLogin}>
                            <div className="flex justify-center mb-6">
                                <input
                                    type="password"
                                    value={loginPin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setLoginPin(val);
                                    }}
                                    placeholder="••••"
                                    autoFocus
                                    className="w-32 text-center text-3xl tracking-[0.5em] p-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border focus:ring-4 focus:ring-light-primary/30 outline-none font-bold text-light-heading dark:text-dark-heading placeholder-gray-300 dark:placeholder-gray-700"
                                />
                            </div>
                            
                            {loginError && <p className="text-center text-red-500 text-xs font-bold mb-4 animate-pulse">{loginError}</p>}

                            <div className="flex gap-2">
                                <button type="button" onClick={() => setSelectedOp(null)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-200 dark:bg-gray-700 text-light-subtle dark:text-dark-text hover:opacity-80 transition">Cancelar</button>
                                <button type="submit" disabled={loginPin.length < 4} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 transition disabled:opacity-50 shadow-lg">Entrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE SEGURANÇA PARA EXCLUSÃO (SENHA MESTRA) */}
            {operatorToDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setOperatorToDeleteId(null)}>
                    <div className="bg-light-panel dark:bg-dark-panel p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border-2 border-red-500/50 transform scale-100" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-light-heading dark:text-dark-heading">Acesso Restrito</h3>
                            <p className="text-xs text-light-subtle dark:text-dark-subtle font-medium mt-1 px-4">
                                Esta ação excluirá permanentemente o operador e seus dados.
                            </p>
                            <p className="text-xs font-bold text-light-heading dark:text-dark-heading mt-2 uppercase tracking-wide">
                                Digite a Senha Mestra
                            </p>
                        </div>
                        
                        <form onSubmit={verifyDeleteAuth}>
                            <div className="flex justify-center mb-6">
                                <input
                                    type="password"
                                    value={deletePin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setDeletePin(val);
                                    }}
                                    placeholder="••••"
                                    autoFocus
                                    className="w-32 text-center text-3xl tracking-[0.5em] p-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-red-200 dark:border-red-900/50 focus:ring-4 focus:ring-red-500/30 outline-none font-bold text-red-500 dark:text-red-400 placeholder-gray-300 dark:placeholder-gray-700"
                                />
                            </div>
                            
                            {deleteError && <p className="text-center text-red-500 text-xs font-bold mb-4 animate-pulse">{deleteError}</p>}

                            <div className="flex gap-2">
                                <button type="button" onClick={() => setOperatorToDeleteId(null)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-200 dark:bg-gray-700 text-light-subtle dark:text-dark-text hover:opacity-80 transition">Cancelar</button>
                                <button type="submit" disabled={deletePin.length < 4} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50 shadow-lg">Confirmar Exclusão</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE CADASTRO */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsAdding(false)}>
                    <div className="bg-light-panel dark:bg-dark-panel p-6 rounded-[2rem] shadow-2xl w-full max-w-sm border border-light-border dark:border-dark-border" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-light-heading dark:text-dark-heading mb-1">Novo Operador</h3>
                        <p className="text-xs text-light-subtle dark:text-dark-subtle mb-4">Crie um perfil para acessar o sistema.</p>
                        
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-light-subtle dark:text-dark-subtle mb-1 ml-1">Nome</label>
                                <input
                                    type="text"
                                    value={newOperatorName}
                                    onChange={(e) => setNewOperatorName(e.target.value)}
                                    placeholder="Ex: Ana Souza"
                                    autoFocus
                                    className="w-full p-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none font-bold text-light-heading dark:text-dark-heading"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-light-subtle dark:text-dark-subtle mb-1 ml-1">E-mail (Obrigatório)</label>
                                <input
                                    type="email"
                                    value={newOperatorEmail}
                                    onChange={(e) => setNewOperatorEmail(e.target.value)}
                                    placeholder="exemplo@email.com"
                                    className="w-full p-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none font-bold text-light-heading dark:text-dark-heading"
                                />
                                <p className="text-[9px] text-light-subtle dark:text-dark-subtle mt-1 ml-1">Usaremos para buscar sua foto de perfil automaticamente.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-light-subtle dark:text-dark-subtle mb-1 ml-1">Criar Senha (4 números)</label>
                                <input
                                    type="password"
                                    value={newOperatorPin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setNewOperatorPin(val);
                                    }}
                                    placeholder="••••"
                                    className="w-full p-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none font-bold text-light-heading dark:text-dark-heading tracking-widest text-center"
                                />
                            </div>
                            
                            <div className="flex gap-2 justify-end mt-6">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-light-subtle hover:bg-light-bg dark:hover:bg-dark-bg transition">Cancelar</button>
                                <button 
                                    type="submit" 
                                    disabled={!newOperatorName.trim() || newOperatorPin.length < 4 || !newOperatorEmail.trim()} 
                                    className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 transition disabled:opacity-50 shadow-md"
                                >
                                    Cadastrar e Entrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE EDIÇÃO */}
            {editingOp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setEditingOp(null)}>
                    <div className="bg-light-panel dark:bg-dark-panel p-6 rounded-[2rem] shadow-2xl w-full max-w-sm border border-light-border dark:border-dark-border relative z-[60]" onClick={e => e.stopPropagation()}>
                        <h3 className={`text-lg font-bold mb-1 ${isForcedUpdate ? 'text-light-danger dark:text-dark-danger' : 'text-light-heading dark:text-dark-heading'}`}>
                            {isForcedUpdate ? 'Atualização Obrigatória' : 'Editar Operador'}
                        </h3>
                        <p className="text-xs text-light-subtle dark:text-dark-subtle mb-4">
                            {isForcedUpdate 
                                ? 'Para continuar, é necessário preencher o e-mail do seu cadastro.' 
                                : 'Atualize as informações do perfil.'
                            }
                        </p>
                        
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-light-subtle dark:text-dark-subtle mb-1 ml-1">Nome</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Ex: Ana Souza"
                                    autoFocus
                                    className="w-full p-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none font-bold text-light-heading dark:text-dark-heading"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-light-subtle dark:text-dark-subtle mb-1 ml-1">
                                    E-mail {isForcedUpdate && <span className="text-light-danger dark:text-dark-danger">(Obrigatório)</span>}
                                </label>
                                <input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    placeholder="exemplo@email.com"
                                    className={`w-full p-3 rounded-xl bg-light-bg dark:bg-dark-bg border focus:ring-2 outline-none font-bold text-light-heading dark:text-dark-heading ${isForcedUpdate && !editEmail ? 'border-light-danger dark:border-dark-danger focus:ring-light-danger' : 'border-light-border dark:border-dark-border focus:ring-light-primary'}`}
                                />
                                <p className="text-[9px] text-light-subtle dark:text-dark-subtle mt-1 ml-1">Necessário para exibição da foto.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-light-subtle dark:text-dark-subtle mb-1 ml-1">Senha (4 números)</label>
                                <input
                                    type="password"
                                    value={editPin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setEditPin(val);
                                    }}
                                    placeholder="••••"
                                    className="w-full p-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none font-bold text-light-heading dark:text-dark-heading tracking-widest text-center"
                                />
                            </div>
                            
                            <div className="flex gap-2 justify-end mt-6">
                                <button type="button" onClick={() => setEditingOp(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-light-subtle hover:bg-light-bg dark:hover:bg-dark-bg transition">Cancelar</button>
                                <button 
                                    type="submit" 
                                    disabled={!editName.trim() || editPin.length < 4 || !editEmail.trim()} 
                                    className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 transition disabled:opacity-50 shadow-md"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <div className="mt-8 text-center">
                 <p className="text-[10px] text-light-subtle dark:text-dark-subtle">
                    Ambiente seguro. Todas as operações são registradas neste perfil.
                </p>
            </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.4s ease-out forwards;
        }
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default OperatorSelection;
