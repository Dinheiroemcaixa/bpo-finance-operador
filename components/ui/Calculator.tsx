
import React, { useState, useCallback, useEffect } from 'react';
import Modal from './Modal';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ isOpen, onClose }) => {
    const [displayValue, setDisplayValue] = useState('0');
    const [previousValue, setPreviousValue] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState(true);
    const [history, setHistory] = useState<string[]>([]);
    const [copySuccess, setCopySuccess] = useState('');

    const calculate = (firstOperand: number, secondOperand: number, op: string): number => {
        switch (op) {
            case '+': return firstOperand + secondOperand;
            case '-': return firstOperand - secondOperand;
            case '*': return firstOperand * secondOperand;
            case '/': return firstOperand / secondOperand;
            default: return secondOperand;
        }
    };

    const clearAll = useCallback(() => {
        setDisplayValue('0');
        setPreviousValue(null);
        setOperator(null);
        setWaitingForOperand(true);
    }, []);
    
    const clearEntry = useCallback(() => {
      setDisplayValue('0');
      setWaitingForOperand(true);
    }, []);

    const inputDigit = useCallback((digit: string) => {
        if (waitingForOperand) {
            setDisplayValue(digit);
            setWaitingForOperand(false);
        } else {
            setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
        }
    }, [displayValue, waitingForOperand]);

    const inputDecimal = useCallback(() => {
        if (!displayValue.includes('.')) {
            setDisplayValue(displayValue + '.');
            setWaitingForOperand(false);
        }
    }, [displayValue]);

    const performOperation = useCallback((nextOperator: string) => {
        const inputValue = parseFloat(displayValue);

        if (previousValue === null) {
            setPreviousValue(inputValue);
        } else if (operator) {
            const result = calculate(previousValue, inputValue, operator);
            setDisplayValue(String(result));
            setHistory(prev => [`${previousValue} ${operator} ${inputValue} = ${result}`, ...prev].slice(0, 20));
            setPreviousValue(result);
        }

        setWaitingForOperand(true);
        setOperator(nextOperator);
    }, [displayValue, operator, previousValue]);

    const handleEquals = useCallback(() => {
        const inputValue = parseFloat(displayValue);
        if (operator && previousValue !== null) {
            const result = calculate(previousValue, inputValue, operator);
            setDisplayValue(String(result));
            setHistory(prev => [`${previousValue} ${operator} ${inputValue} = ${result}`, ...prev].slice(0, 20));
            setPreviousValue(null);
            setOperator(null);
            setWaitingForOperand(true);
        }
    }, [displayValue, operator, previousValue]);
    
    const toggleSign = useCallback(() => {
        setDisplayValue(String(parseFloat(displayValue) * -1));
    }, [displayValue]);

    const inputPercent = useCallback(() => {
        setDisplayValue(String(parseFloat(displayValue) / 100));
        setWaitingForOperand(true);
    }, [displayValue]);

    const backspace = useCallback(() => {
        if (displayValue.length > 1) {
            setDisplayValue(displayValue.slice(0, -1));
        } else {
            setDisplayValue('0');
        }
    }, [displayValue]);

    const handleCopy = () => {
      navigator.clipboard.writeText(displayValue).then(() => {
        setCopySuccess('Copiado!');
        setTimeout(() => setCopySuccess(''), 1500);
      }, () => {
        setCopySuccess('Falhou!');
        setTimeout(() => setCopySuccess(''), 1500);
      });
    };

    // Keyboard support
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const { key } = event;

            // Numbers 0-9
            if (/^[0-9]$/.test(key)) {
                event.preventDefault();
                inputDigit(key);
            }
            // Operators
            else if (key === '+') {
                event.preventDefault();
                performOperation('+');
            }
            else if (key === '-') {
                event.preventDefault();
                performOperation('-');
            }
            else if (key === '*' || key.toLowerCase() === 'x') {
                event.preventDefault();
                performOperation('*');
            }
            else if (key === '/') {
                event.preventDefault();
                performOperation('/');
            }
            // Decimal
            else if (key === '.' || key === ',') {
                event.preventDefault();
                inputDecimal();
            }
            // Equals / Enter
            else if (key === 'Enter' || key === '=') {
                event.preventDefault();
                handleEquals();
            }
            // Backspace
            else if (key === 'Backspace') {
                event.preventDefault();
                backspace();
            }
            // Clear (Delete key)
            else if (key === 'Delete') {
                event.preventDefault();
                clearAll();
            }
            // Close (Escape)
            else if (key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, inputDigit, performOperation, inputDecimal, handleEquals, backspace, clearAll, onClose]);

    const CalculatorKey: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string, title?: string }> = ({ onClick, children, className = '', title }) => (
        <button 
          onClick={onClick} 
          className={`flex items-center justify-center p-4 rounded-lg text-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-panel ${className}`}
          title={title}
        >
            {children}
        </button>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Calculadora" size="sm">
            <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-2 md:p-4 space-y-4">
                <div className="h-24 overflow-y-auto text-right text-sm text-light-subtle dark:text-dark-subtle p-2 border border-light-border dark:border-dark-border rounded-md flex flex-col-reverse">
                    {history.length > 0 ? history.map((line, index) => <div key={index} className="opacity-75">{line}</div>) : <div className="text-center self-center">Histórico de cálculos</div>}
                </div>
                
                <div className="relative">
                  <div className="text-4xl font-mono text-right p-4 bg-light-panel dark:bg-dark-panel rounded-md truncate pr-12">
                      {parseFloat(displayValue).toLocaleString('pt-BR', { maximumFractionDigits: 10 })}
                  </div>
                  <button onClick={handleCopy} title="Copiar valor" className="absolute top-1/2 right-3 -translate-y-1/2 text-light-subtle dark:text-dark-subtle hover:text-light-heading dark:hover:text-dark-heading p-1 rounded-full hover:bg-light-border dark:hover:bg-dark-border">
                    {copySuccess ? 
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-accent dark:text-dark-accent" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg> :
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    }
                  </button>
                   {copySuccess && <div className="absolute -bottom-6 right-2 text-xs bg-light-accent text-white px-2 py-0.5 rounded-md">{copySuccess}</div>}
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <CalculatorKey onClick={clearAll} className="bg-light-danger/80 dark:bg-dark-danger/80 text-white hover:bg-light-danger dark:hover:bg-dark-danger" title="Limpar Tudo (Delete)">C</CalculatorKey>
                    <CalculatorKey onClick={clearEntry} className="bg-light-warning/80 dark:bg-dark-warning/80 text-white hover:bg-light-warning dark:hover:bg-dark-warning">CE</CalculatorKey>
                    <CalculatorKey onClick={backspace} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border" title="Apagar (Backspace)">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 12M3 12l6.414-6.414a2 2 0 012.828 0L21 12" />
                      </svg>
                    </CalculatorKey>
                    <CalculatorKey onClick={() => performOperation('/')} className="bg-light-primary/80 dark:bg-dark-primary/80 text-white hover:bg-light-primary dark:hover:bg-dark-primary">÷</CalculatorKey>
                    
                    <CalculatorKey onClick={() => inputDigit('7')} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">7</CalculatorKey>
                    <CalculatorKey onClick={() => inputDigit('8')} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">8</CalculatorKey>
                    <CalculatorKey onClick={() => inputDigit('9')} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">9</CalculatorKey>
                    <CalculatorKey onClick={() => performOperation('*')} className="bg-light-primary/80 dark:bg-dark-primary/80 text-white hover:bg-light-primary dark:hover:bg-dark-primary">×</CalculatorKey>
                    
                    <CalculatorKey onClick={() => inputDigit('4')} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">4</CalculatorKey>
                    <CalculatorKey onClick={() => inputDigit('5')} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">5</CalculatorKey>
                    <CalculatorKey onClick={() => inputDigit('6')} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">6</CalculatorKey>
                    <CalculatorKey onClick={() => performOperation('-')} className="bg-light-primary/80 dark:bg-dark-primary/80 text-white hover:bg-light-primary dark:hover:bg-dark-primary">-</CalculatorKey>
                    
                    <CalculatorKey onClick={() => inputDigit('1')} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">1</CalculatorKey>
                    <CalculatorKey onClick={() => inputDigit('2')} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">2</CalculatorKey>
                    <CalculatorKey onClick={() => inputDigit('3')} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">3</CalculatorKey>
                    <CalculatorKey onClick={() => performOperation('+')} className="bg-light-primary/80 dark:bg-dark-primary/80 text-white hover:bg-light-primary dark:hover:bg-dark-primary">+</CalculatorKey>

                    <CalculatorKey onClick={() => inputDigit('0')} className="col-span-2 bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">0</CalculatorKey>
                    <CalculatorKey onClick={inputDecimal} className="bg-light-panel dark:bg-dark-panel hover:bg-light-border dark:hover:bg-dark-border">.</CalculatorKey>
                    <CalculatorKey onClick={handleEquals} className="bg-light-accent dark:bg-dark-accent text-white hover:opacity-90">=</CalculatorKey>
                </div>
            </div>
        </Modal>
    );
};

export default Calculator;
