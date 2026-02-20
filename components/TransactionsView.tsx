
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Loja, DDA, Agendamento, Transferencia, Recebimento, AggregatedItem } from '../types';
import { toBRL } from '../utils/formatters';
import DateRangePicker from './ui/DateRangePicker';
import { exportTransactionsToExcel } from '../services/excelService';
import { exportTransactionsToPdf } from '../services/pdfService';
import Header from './Header';

interface TransactionsViewProps {
  groupName: string;
  allItems: AggregatedItem[];
  allLojas: { [key: string]: Loja };
  onBack: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenCalculator: () => void;
}

const TransactionsView: React.FC<TransactionsViewProps> = ({ groupName, allItems, allLojas, onBack, theme, toggleTheme, onOpenCalculator }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aberto' | 'pago'>('todos');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'dda' | 'agend' | 'transf' | 'receb'>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setTypeFilter('todos');
    setStartDate('');
    setEndDate('');
  };
  
  const handleRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const filteredItems = useMemo(() => {
    const parseDdaDate = (dateStr: string): string => {
        if (!dateStr || typeof dateStr !== 'string') return '';
        const parts = dateStr.split('/');
        if (parts.length !== 3) return '';
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    let items = [...allItems];

    if (typeFilter !== 'todos') {
        items = items.filter(item => item.type === typeFilter);
    }
    
    if (startDate || endDate) {
        items = items.filter(item => {
            let itemDateStr = '';
            const { type, data } = item;
            if (type === 'dda') itemDateStr = parseDdaDate((data as DDA).venc);
            else if (type === 'agend' || type === 'transf' || type === 'folha') itemDateStr = (data as Agendamento | Transferencia).data;
            else if (type === 'receb') {
                const originTransfer = (Object.values(allLojas) as Loja[]).flatMap(l => l.transf).find(t => t.id === (data as Recebimento).id);
                if (originTransfer) itemDateStr = originTransfer.data;
            }
            if (!itemDateStr) return false;
            const isAfterStart = !startDate || itemDateStr >= startDate;
            const isBeforeEnd = !endDate || itemDateStr <= endDate;
            return isAfterStart && isBeforeEnd;
        });
    }

    if (statusFilter !== 'todos') {
        items = items.filter(item => {
            const { type, data } = item;
            if (type === 'dda' || type === 'agend' || type === 'transf' || type === 'folha') {
                return ((data as DDA | Agendamento | Transferencia).status || 'aberto') === statusFilter;
            }
            if (statusFilter === 'pago') return type === 'receb';
            return false;
        });
    }

    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        items = items.filter(item => {
            const { type, data, lojaNome } = item;
            let content = `${lojaNome} `;
            switch (type) {
                case 'dda':
                    const d = data as DDA;
                    content += `${d.benef} ${d.doc} ${d.venc} ${toBRL(d.valor)}`;
                    break;
                case 'agend':
                case 'folha':
                    const a = data as Agendamento;
                    const formattedAgendDate = new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                    content += `${a.fornecedor} ${a.descricao || ''} ${a.categoriaFolha || ''} ${a.tipo} ${a.chavePix || ''} ${toBRL(a.valor)} ${formattedAgendDate}`;
                    break;
                case 'transf':
                    const t = data as Transferencia;
                    const formattedTransfDate = new Date(t.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                    content += `${t.desc} ${t.origem} ${t.destino} ${toBRL(t.valor)} ${formattedTransfDate}`;
                    break;
                case 'receb':
                    const r = data as Recebimento;
                    const originTransfer = (Object.values(allLojas) as Loja[]).flatMap(l => l.transf).find(t => t.id === r.id);
                    const origin = originTransfer?.origem || 'Desconhecido';
                    const formattedRecebDate = originTransfer ? new Date(originTransfer.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
                    content += `de: ${origin} ${toBRL(r.valor)} ${formattedRecebDate}`;
                    break;
            }
            return content.toLowerCase().includes(lowerSearch);
        });
    }

    return items;
  }, [allItems, searchTerm, statusFilter, typeFilter, startDate, endDate, allLojas]);
  
  const totalValue = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
        const { type, data } = item;
        if (type === 'receb') {
            return acc + (data as Recebimento).valor;
        } else if (type === 'dda' || type === 'agend' || type === 'transf' || type === 'folha') {
            return acc - (data as DDA | Agendamento | Transferencia).valor;
        }
        return acc;
    }, 0);
  }, [filteredItems]);


  return (
    <div className="min-h-screen bg-bpo-standard-light dark:bg-bpo-standard-dark bg-cover bg-fixed text-light-text dark:text-dark-text transition-colors duration-500">
        <Header 
            groupName={groupName} 
            onNewStore={() => {}} 
            onExportExcel={() => exportTransactionsToExcel(filteredItems, groupName, allLojas)} 
            onExportPdf={() => exportTransactionsToPdf(filteredItems, groupName, allLojas)} 
            onBackToGroups={onBack} 
            onOpenCalculator={onOpenCalculator} 
            onOpenPaymentRules={() => {}} 
        />

        <main className="p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto">
                <div className="space-y-4 p-4 rounded-2xl bg-light-panel dark:bg-dark-panel border border-light-border dark:border-dark-border mb-6 shadow-lg">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por loja, beneficiário, data, valor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-light-subtle dark:text-dark-subtle mb-1">Tipo</label>
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="w-full px-3 py-2 text-sm rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:outline-none">
                                <option value="todos">Todos os Tipos</option>
                                <option value="dda">DDA</option>
                                <option value="agend">Agendamento</option>
                                <option value="transf">Transferência</option>
                                <option value="receb">Recebimento</option>
                                <option value="folha">Folha de Pagto</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 lg:col-span-1">
                            <DateRangePicker 
                                startDate={startDate}
                                endDate={endDate}
                                onRangeChange={handleRangeChange}
                            />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-light-subtle dark:text-dark-subtle mb-1">Situação</label>
                            <div className="flex items-center gap-1 bg-light-bg dark:bg-dark-bg p-1 rounded-lg border border-light-border dark:border-dark-border">
                                <button onClick={() => setStatusFilter('todos')} className={`flex-1 px-3 py-1 text-sm rounded-md font-semibold transition ${statusFilter === 'todos' ? 'bg-light-primary text-white shadow-sm' : 'hover:bg-light-border dark:hover:bg-dark-border'}`}>Todos</button>
                                <button onClick={() => setStatusFilter('aberto')} className={`flex-1 px-3 py-1 text-sm rounded-md font-semibold transition ${statusFilter === 'aberto' ? 'bg-light-primary text-white shadow-sm' : 'hover:bg-light-border dark:hover:bg-dark-border'}`}>Aberto</button>
                                <button onClick={() => setStatusFilter('pago')} className={`flex-1 px-3 py-1 text-sm rounded-md font-semibold transition ${statusFilter === 'pago' ? 'bg-light-primary text-white shadow-sm' : 'hover:bg-light-border dark:hover:bg-dark-border'}`}>Pago</button>
                            </div>
                        </div>
                        <button onClick={handleResetFilters} className="w-full px-4 py-2 text-sm rounded-lg font-semibold bg-light-border dark:border-dark-border hover:opacity-80 transition flex items-center justify-center gap-2">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           <span>Limpar</span>
                        </button>
                    </div>
                </div>

                <div className="bg-light-panel dark:bg-dark-panel rounded-2xl shadow-lg border border-light-border dark:border-dark-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-light-bg dark:bg-dark-bg text-light-subtle dark:text-dark-subtle sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Loja</th>
                                    <th scope="col" className="px-6 py-3">Tipo</th>
                                    <th scope="col" className="px-6 py-3">Beneficiário/Origem</th>
                                    <th scope="col" className="px-6 py-3">Descrição / Anexo</th>
                                    <th scope="col" className="px-6 py-3">Situação</th>
                                    <th scope="col" className="px-6 py-3">Data Pg.</th>
                                    <th scope="col" className="px-6 py-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length > 0 ? filteredItems.map((item, index) => {
                                    const { lojaNome, type, data } = item;
                                    let benef, desc, situacao, dataPg, valor, valorClass, valorPrefix;
                                    let hasAttachment = false;
                                    let attachmentUrl: string | undefined = undefined;

                                    switch (type) {
                                        case 'dda':
                                            const d = data as DDA;
                                            benef = d.benef; desc = d.doc; situacao = (d.status || 'aberto') === 'pago' ? 'Agendado' : 'Em Aberto'; dataPg = d.venc; valor = d.valor;
                                            valorClass = 'text-light-danger dark:text-dark-danger'; valorPrefix = '- ';
                                            break;
                                        case 'agend':
                                        case 'folha':
                                            const a = data as Agendamento;
                                            benef = a.fornecedor; 
                                            const catStr = a.categoriaFolha ? `[${a.categoriaFolha}] ` : '';
                                            desc = `${catStr}${a.descricao || '-'}`; 
                                            situacao = a.status === 'pago' ? 'Agendado' : 'Em Aberto'; dataPg = new Date(a.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}); valor = a.valor;
                                            valorClass = 'text-light-danger dark:text-dark-danger'; valorPrefix = '- ';
                                            if (a.anexo) {
                                                hasAttachment = true;
                                                attachmentUrl = a.anexo;
                                            }
                                            break;
                                        case 'transf':
                                            const t = data as Transferencia;
                                            benef = t.desc; desc = `Origem: ${t.origem} / Destino: ${t.destino}`; situacao = t.status === 'pago' ? 'Agendado' : 'Em Aberto'; dataPg = new Date(t.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}); valor = t.valor;
                                            valorClass = 'text-light-danger dark:text-dark-danger'; valorPrefix = '- ';
                                            break;
                                        case 'receb':
                                            const r = data as Recebimento;
                                            const originTransfer = (Object.values(allLojas) as Loja[]).flatMap(l => l.transf).find(t => t.id === r.id);
                                            benef = `De: ${originTransfer?.origem || 'Desconhecido'}`; desc = '-'; situacao = 'Recebido'; dataPg = originTransfer ? new Date(originTransfer.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'; valor = r.valor;
                                            valorClass = 'text-light-accent dark:text-dark-accent'; valorPrefix = '+ ';
                                            break;
                                    }

                                    return (
                                        <tr key={`${lojaNome}-${type}-${index}`} className="border-b border-light-border dark:border-dark-border hover:bg-light-bg/50 dark:hover:bg-dark-bg/50">
                                            <td className="px-6 py-4 font-semibold">{lojaNome}</td>
                                            <td className="px-6 py-4 font-medium uppercase text-light-subtle dark:text-dark-subtle text-xs">{type}</td>
                                            <td className="px-6 py-4">{benef}</td>
                                            <td className="px-6 py-4 text-light-subtle dark:text-dark-subtle">
                                                <div className="flex items-center gap-2">
                                                    <span>{desc}</span>
                                                    {hasAttachment && attachmentUrl && (
                                                        <a 
                                                            href={attachmentUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="p-1 rounded-md bg-light-primary/10 text-light-primary hover:bg-light-primary hover:text-white transition-all shrink-0"
                                                            title="Ver Anexo/Comprovante"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                            </svg>
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${ situacao === 'Agendado' || situacao === 'Recebido' ? 'bg-light-accent/10 text-light-accent dark:bg-dark-accent/20' : 'bg-light-warning/10 text-light-warning dark:bg-dark-warning/20' }`}>
                                                    {situacao}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{dataPg}</td>
                                            <td className={`px-6 py-4 text-right font-mono ${valorClass}`}>{valorPrefix}{toBRL(valor)}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={7} className="text-center py-20 text-light-subtle dark:text-dark-subtle">
                                            Nenhum lançamento encontrado para os filtros selecionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-light-bg dark:bg-dark-bg font-bold text-right border-t border-light-border dark:border-dark-border">
                        Saldo dos Itens Filtrados: <span className={totalValue >= 0 ? "text-light-accent dark:text-dark-accent" : "text-light-danger dark:text-dark-danger"}>{toBRL(totalValue)}</span>
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
};

export default TransactionsView;
