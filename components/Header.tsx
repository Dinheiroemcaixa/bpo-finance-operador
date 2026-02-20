
import React, { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  groupName: string;
  onNewStore: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportJson?: () => void; // Nova prop para backup global
  onBackToGroups: () => void;
  onNavigateToTransactions?: () => void;
  onOpenCalculator: () => void;
  onOpenPaymentRules: () => void;
  onOpenCollaborators?: () => void;
  currentOperator?: string;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  groupName, 
  onNewStore, 
  onExportExcel, 
  onExportPdf, 
  onExportJson,
  onBackToGroups, 
  onNavigateToTransactions, 
  onOpenCalculator, 
  onOpenPaymentRules,
  onOpenCollaborators,
  currentOperator,
  onLogout
}) => {
  const [isExportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-light-panel dark:bg-dark-panel shadow-md p-4 sticky top-0 z-40 border-b border-light-border dark:border-dark-border">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBackToGroups} className="px-3 py-2 text-sm rounded-lg font-semibold bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border transition flex items-center text-light-text dark:text-dark-text">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Voltar
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-light-heading dark:text-dark-heading">Pagamentos BPO Financeiro</h1>
            <span className="text-sm text-light-subtle dark:text-dark-subtle">Grupo: {groupName}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           
           {currentOperator && (
             <div className="hidden sm:flex items-center gap-2 mr-2 border-r border-light-border dark:border-dark-border pr-4">
                <div className="text-right">
                    <p className="text-[9px] font-bold uppercase text-light-subtle dark:text-dark-subtle">Operador</p>
                    <p className="text-xs font-black text-light-heading dark:text-dark-heading">{currentOperator}</p>
                </div>
                {onLogout && (
                    <button onClick={onLogout} title="Trocar Operador" className="w-6 h-6 rounded-full bg-light-bg dark:bg-dark-bg text-light-subtle hover:text-light-danger transition-colors flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                )}
             </div>
           )}

           <button onClick={onOpenPaymentRules} className="p-2 rounded-full text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border transition relative" title="Regras de Alerta">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
           </button>
           <button onClick={onOpenCalculator} className="p-2 rounded-full text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border transition" title="Calculadora">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 3h.008v.008H8.25v-.008Zm0 3h.008v.008H8.25v-.008Zm3-6h.008v.008H11.25v-.008Zm0 3h.008v.008H11.25v-.008Zm0 3h.008v.008H11.25v-.008Zm3-6h.008v.008H14.25v-.008Zm0 3h.008v.008H14.25v-.008ZM12 6.75h2.25M12 9.75h2.25M12 12.75h2.25M12 15.75h2.25M4.5 21V5.25A2.25 2.25 0 0 1 6.75 3h10.5A2.25 2.25 0 0 1 19.5 5.25V21M4.5 21H19.5" />
              </svg>
           </button>

          {onOpenCollaborators && (
            <button onClick={onOpenCollaborators} className="px-3 py-2 text-sm rounded-lg font-semibold bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border transition flex items-center text-light-text dark:text-dark-text">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-light-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Colaboradores
            </button>
          )}

          <button onClick={onNewStore} className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90 transition flex items-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nova Loja
          </button>
          
          <div className="relative" ref={exportMenuRef}>
            <button onClick={() => setExportMenuOpen(!isExportMenuOpen)} className="px-3 py-2 text-sm rounded-lg font-semibold bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border transition flex items-center text-light-text dark:text-dark-text">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Exportar
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-light-panel dark:bg-dark-panel rounded-md shadow-lg z-50 border border-light-border dark:border-dark-border py-1">
                <button onClick={() => { onExportExcel(); setExportMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border transition">
                  Excel (.xlsx)
                </button>
                <button onClick={() => { onExportPdf(); setExportMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border transition border-t border-light-border dark:border-dark-border">
                  PDF (.pdf)
                </button>
                {onExportJson && (
                   <button onClick={() => { onExportJson(); setExportMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm font-bold text-light-primary dark:text-dark-primary hover:bg-light-primary/10 transition border-t border-light-border dark:border-dark-border flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    Backup Global (.json)
                  </button>
                )}
              </div>
            )}
          </div>

          {onNavigateToTransactions && (
            <button onClick={onNavigateToTransactions} className="px-3 py-2 text-sm rounded-lg font-semibold bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border transition flex items-center text-light-text dark:text-dark-text">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Transações
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
