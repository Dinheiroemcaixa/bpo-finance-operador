import React, { useState, useEffect, useRef } from 'react';

// Helper functions for dates
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const getEndOfWeek = (date: Date) => {
  const d = new Date(getStartOfWeek(date));
  return new Date(d.setDate(d.getDate() + 6));
};

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onRangeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(startDate);
  const [customEndDate, setCustomEndDate] = useState(endDate);
  const [isCustom, setIsCustom] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);
  
  useEffect(() => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  }, [startDate, endDate]);


  const handlePresetClick = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'this_week':
        start = getStartOfWeek(today);
        end = getEndOfWeek(today);
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'this_year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case 'last_30_days':
        start.setDate(today.getDate() - 30);
        end = today;
        break;
      case 'last_12_months':
        start.setFullYear(today.getFullYear() - 1);
        end = today;
        break;
      case 'all':
        onRangeChange('', '');
        setIsCustom(false);
        setIsOpen(false);
        return;
      case 'custom':
        setIsCustom(true);
        // Don't close dropdown
        return;
    }

    onRangeChange(formatDate(start), formatDate(end));
    setIsCustom(false);
    setIsOpen(false);
  };
  
  const handleCustomApply = () => {
    onRangeChange(customStartDate, customEndDate);
    setIsCustom(false);
    setIsOpen(false);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!startDate || !endDate) return;
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    const diff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24) + 1;
    const multiplier = direction === 'prev' ? -1 : 1;
    
    start.setDate(start.getDate() + (diff * multiplier));
    end.setDate(end.getDate() + (diff * multiplier));
    
    onRangeChange(formatDate(start), formatDate(end));
  };
  
  const displayRange = () => {
    if (!startDate || !endDate) return 'Todo o período';
    const startFormatted = formatDisplayDate(startDate);
    const endFormatted = formatDisplayDate(endDate);
    if (startFormatted === endFormatted) return startFormatted;
    return `${startFormatted} até ${endFormatted}`;
  };

  const presets = [
    { key: 'today', label: 'Hoje' },
    { key: 'this_week', label: 'Esta semana' },
    { key: 'this_month', label: 'Este mês' },
    { key: 'this_year', label: 'Este ano' },
    { key: 'last_30_days', label: 'Últimos 30 dias' },
    { key: 'last_12_months', label: 'Últimos 12 meses' },
    { key: 'all', label: 'Todo o período' },
    { key: 'custom', label: 'Período personalizado' },
  ];

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs font-medium text-light-subtle dark:text-dark-subtle mb-1">Vencimento</label>
      <div className="flex items-center rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
        <button type="button" onClick={() => handleNavigate('prev')} className="px-2 py-2 text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border rounded-l-lg focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex-grow px-3 py-2 text-sm text-center w-full flex justify-between items-center border-l border-r border-light-border dark:border-dark-border">
            <span>{displayRange()}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-subtle dark:text-dark-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        
        <button type="button" onClick={() => handleNavigate('next')} className="px-2 py-2 text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border rounded-r-lg focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-light-panel dark:bg-dark-panel rounded-lg shadow-lg z-10 border border-light-border dark:border-dark-border">
          <ul className="py-1">
            {presets.map(p => (
              <li key={p.key}>
                <button type="button" onClick={() => handlePresetClick(p.key)} className="w-full text-left px-4 py-2 text-sm hover:bg-light-border dark:hover:bg-dark-border">
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
          {isCustom && (
            <div className="p-4 border-t border-light-border dark:border-dark-border space-y-2">
              <div>
                <label className="block text-xs font-medium text-light-subtle dark:text-dark-subtle mb-1">De:</label>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full px-2 py-1 text-sm rounded-md bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-light-subtle dark:text-dark-subtle mb-1">Até:</label>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full px-2 py-1 text-sm rounded-md bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"/>
              </div>
              <button onClick={handleCustomApply} className="w-full mt-2 px-4 py-2 text-sm rounded-lg font-semibold text-white bg-light-primary dark:bg-dark-primary hover:opacity-90">Aplicar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
