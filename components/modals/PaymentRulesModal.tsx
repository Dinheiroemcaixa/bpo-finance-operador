
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { PaymentRule } from '../../types';
import { formatCurrencyInput, parseVal, toBRLInput } from '../../utils/formatters';

interface PaymentRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: PaymentRule[];
  onUpdateRules: (newRules: PaymentRule[]) => void;
}

const PaymentRulesModal: React.FC<PaymentRulesModalProps> = ({ isOpen, onClose, rules, onUpdateRules }) => {
  const [term, setTerm] = useState('');
  const [matchDoc, setMatchDoc] = useState('');
  const [matchValue, setMatchValue] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [message, setMessage] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTerm('');
    setMatchDoc('');
    setMatchValue('');
    setMatchDate('');
    setMessage('');
    setIsRecurring(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate that at least one criteria is filled
    if (!term.trim() && !matchDoc.trim() && !parseVal(matchValue) && !matchDate) {
        alert("Preencha pelo menos um critério (Termo, Doc, Valor ou Data).");
        return;
    }
    if (!message.trim()) {
        alert("Preencha a mensagem de alerta.");
        return;
    }

    const ruleData: PaymentRule = {
        id: editingId || Date.now().toString(),
        term: term.trim(),
        matchDoc: matchDoc.trim() || undefined,
        matchValue: parseVal(matchValue) || undefined,
        matchDate: matchDate || undefined,
        alertMessage: message.trim(),
        isRecurring: isRecurring
    };

    if (editingId) {
      const updatedRules = rules.map(rule => 
        rule.id === editingId ? ruleData : rule
      );
      onUpdateRules(updatedRules);
    } else {
      onUpdateRules([...rules, ruleData]);
    }
    resetForm();
  };

  const handleEdit = (rule: PaymentRule) => {
    setTerm(rule.term);
    setMatchDoc(rule.matchDoc || '');
    setMatchValue(rule.matchValue ? toBRLInput(rule.matchValue) : '');
    setMatchDate(rule.matchDate || '');
    setMessage(rule.alertMessage);
    setIsRecurring(!!rule.isRecurring);
    setEditingId(rule.id);
  };

  const handleDelete = (id: string) => {
    onUpdateRules(rules.filter(r => r.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const formatDisplayDate = (dateStr?: string) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
  };
  
  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length <= 11) {
          // CPF
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else {
          // CNPJ
          value = value.substring(0, 14); // Limit to 14 digits
          value = value.replace(/^(\d{2})(\d)/, '$1.$2');
          value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
          value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
          value = value.replace(/(\d{4})(\d)/, '$1-$2');
      }
      setMatchDoc(value);
  };

  const handleRecurringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setIsRecurring(checked);
      if (checked && !message) {
          setMessage('RECORRENTE - NÃO PAGAR');
      }
  };

  const showRecurringWarning = isRecurring && (parseVal(matchValue) > 0 || matchDate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Regras de Alerta de Pagamento"
      size="2xl"
    >
      <div className="space-y-6">
        <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-lg text-sm text-light-subtle dark:text-dark-subtle border border-light-border dark:border-dark-border">
          <p>
            Crie regras para receber alertas antes de pagar. A regra criada funcionará automaticamente para todos os meses futuros.
            <br/>
            Preencha <strong>pelo menos um</strong> dos campos de critério.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-light-panel dark:bg-dark-panel border border-light-border dark:border-dark-border rounded-lg shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Nome/Termo (Contém)</label>
                <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Ex: Claro, CEMIG, Saneago"
                    className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Documento (CPF/CNPJ)</label>
                <input
                    type="text"
                    value={matchDoc}
                    onChange={handleDocChange}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Valor Exato</label>
                <input
                    type="text"
                    value={matchValue}
                    onChange={(e) => setMatchValue(formatCurrencyInput(e.target.value))}
                    placeholder="Ex: 0,00"
                    className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border text-right"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Data de Vencimento</label>
                <input
                    type="date"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border"
                />
            </div>

            <div className="sm:col-span-2">
                <div className="flex items-center gap-2 mb-1">
                    <input 
                        type="checkbox" 
                        id="isRecurring"
                        checked={isRecurring}
                        onChange={handleRecurringChange}
                        className="w-4 h-4 text-light-primary bg-white border-gray-300 rounded focus:ring-light-primary dark:focus:ring-dark-primary dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="isRecurring" className="text-sm font-bold text-light-heading dark:text-dark-heading cursor-pointer flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Recorrente (Todo Mês)
                    </label>
                </div>
                <p className="text-xs text-light-subtle dark:text-dark-subtle mb-3 pl-6">
                    Ao marcar, o alerta exibirá um ícone de ciclo (<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>), ideal para contas fixas.
                </p>

                {showRecurringWarning && (
                    <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p>
                            <strong>Dica:</strong> Para despesas recorrentes que mudam de preço (Água, Luz), <strong>apague o valor e a data</strong> desta regra. Use apenas o Nome ou Documento. Assim ela funcionará o ano todo, independente do valor do mês.
                        </p>
                    </div>
                )}

              <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle">Mensagem de Alerta (Obrigatório)</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: RECORRENTE - NÃO PAGAR"
                className="w-full mt-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border font-bold text-light-danger dark:text-dark-danger"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editingId && (
              <button 
                type="button" 
                onClick={resetForm}
                className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-600 hover:opacity-80"
              >
                Cancelar Edição
              </button>
            )}
            <button 
              type="submit" 
              className="px-4 py-1.5 text-sm rounded font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90"
            >
              {editingId ? 'Atualizar Regra' : 'Adicionar Regra'}
            </button>
          </div>
        </form>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {rules.length === 0 ? (
            <p className="text-center text-light-subtle dark:text-dark-subtle py-4">Nenhuma regra cadastrada.</p>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className={`flex items-center justify-between p-3 border rounded-lg ${rule.isRecurring ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-800 border-light-border dark:border-dark-border'}`}>
                <div className="flex-grow">
                  <div className="flex flex-wrap gap-2 mb-1">
                      {rule.term && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Termo: {rule.term}</span>}
                      {rule.matchDoc && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Doc: {rule.matchDoc}</span>}
                      {rule.matchValue && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Valor: {toBRLInput(rule.matchValue)}</span>}
                      {rule.matchDate && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Data: {formatDisplayDate(rule.matchDate)}</span>}
                      {rule.isRecurring && (
                          <span className="text-xs bg-light-primary text-white px-2 py-1 rounded flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Recorrente
                          </span>
                      )}
                  </div>
                  <div className="text-sm text-light-danger dark:text-dark-danger font-bold flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {rule.alertMessage}
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <button onClick={() => handleEdit(rule)} className="p-1.5 text-light-subtle dark:text-dark-subtle hover:text-light-primary dark:hover:text-dark-primary transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-light-subtle dark:text-dark-subtle hover:text-light-danger dark:hover:text-dark-danger transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PaymentRulesModal;
