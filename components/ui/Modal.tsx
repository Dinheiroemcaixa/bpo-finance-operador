import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Changed title from string to React.ReactNode to allow complex titles with icons.
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'lg' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
      <div 
        className={`bg-light-panel dark:bg-dark-panel text-light-text dark:text-dark-text rounded-2xl shadow-2xl w-full ${sizeClasses[size]} mx-4 p-6 border border-light-border dark:border-dark-border transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-light-heading dark:text-dark-heading">{title}</h2>
          <button onClick={onClose} className="text-light-subtle dark:text-dark-subtle hover:text-light-danger dark:hover:text-dark-danger transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
            {children}
        </div>
        {footer && (
            <div className="mt-6 text-right space-x-3">
                {footer}
            </div>
        )}
      </div>
      <style>{`
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Modal;
