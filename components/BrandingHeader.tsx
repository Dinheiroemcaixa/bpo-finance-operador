
import React from 'react';

const BrandingHeader: React.FC = () => {
  // Logotipo oficial "Dinheiro em Caixa" - Reconstrução fiel em SVG
  const OfficialLogoIcon = ({ size = "h-20 w-20" }: { size?: string }) => (
    <svg viewBox="0 0 400 350" className={`${size} drop-shadow-xl`} xmlns="http://www.w3.org/2000/svg">
      <text x="200" y="140" textAnchor="middle" fill="#00c853" fontSize="130" fontWeight="900" fontFamily="Inter, sans-serif" style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.1))' }}>$</text>
      <g stroke="#001b5e" strokeWidth="12" strokeLinejoin="round" fill="none">
        <path d="M155 130 L100 160 L145 200 L200 170 Z" fill="white" strokeWidth="8"/>
        <path d="M245 130 L300 160 L255 200 L200 170 Z" fill="white" strokeWidth="8"/>
        <path d="M145 200 L145 280 L200 315 L200 235 Z" fill="#001b5e"/>
        <path d="M255 200 L255 280 L200 315 L200 235 Z" fill="#001b5e" opacity="0.95"/>
      </g>
      <text x="172" y="245" textAnchor="middle" fill="white" fontSize="42" fontWeight="900" fontFamily="Inter, sans-serif" transform="skewY(18)">DC</text>
    </svg>
  );

  const menuItems = ["Painel", "Gestão DDA", "Folha BPO", "Relatórios", "Configurações", "Ajuda"];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100 border border-gray-300 shadow-2xl mb-12 flex flex-col group">
      
      {/* 1. Barra de Menu Superior (Estilo ERP DataCar) */}
      <div className="bg-[#001b5e] px-4 py-2 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            {menuItems.map((item, idx) => (
              <button key={idx} className="text-[10px] font-bold text-blue-200/70 hover:text-white uppercase tracking-wider transition-colors">
                {item}
              </button>
            ))}
          </nav>
        </div>
        <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
          Dinheiro em Caixa - Enterprise Edition
        </div>
      </div>

      {/* 2. Área Principal (Visual BPO Financeiro) */}
      <div className="relative flex flex-col lg:flex-row items-stretch min-h-[420px] bg-white">
        {/* Lado Esquerdo: Branding */}
        <div className="flex-1 p-8 lg:p-14 z-10 flex flex-col justify-center">
          <div className="flex items-center gap-6 mb-8 animate-fade-in">
            <OfficialLogoIcon size="h-24 w-24 md:h-32 md:w-32" />
            <div className="flex flex-col">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.85] flex flex-col">
                <span className="text-[#001b5e]">DINHEIRO EM</span>
                <span className="text-[#00c853]">CAIXA</span>
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 w-10 bg-[#00c853] rounded-full"></div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#001b5e]/60">
                  Terceirização Financeira
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 max-w-lg">
            <h3 className="text-2xl font-bold text-gray-800 leading-tight">
              A inteligência do seu backoffice financeiro <br />
              <span className="text-[#001b5e] font-black underline decoration-[#00c853] decoration-4 underline-offset-4">
                operando em tempo real.
              </span>
            </h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              Otimize o fluxo de caixa do seu grupo empresarial com nossa gestão especializada em DDA, Folha e Transferências intercompany.
            </p>
          </div>
        </div>

        {/* Lado Direito: Imagem Contextual (Especialista Financeiro) */}
        <div className="relative w-full lg:w-[45%] min-h-[300px] overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1554224155-169745fe995d?q=80&w=1200&auto=format&fit=crop" 
            alt="Especialista BPO Financeiro" 
            className="w-full h-full object-cover grayscale-[20%] transition-transform duration-[10s] group-hover:scale-105"
          />
          {/* Overlay gradiente para suavizar a transição */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent lg:hidden"></div>
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/40 to-transparent hidden lg:block"></div>
          
          {/* Badge flutuante de status do "Sistema" */}
          <div className="absolute bottom-6 right-6 px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-md border border-gray-200 shadow-2xl flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00c853] animate-pulse"></div>
                <span className="text-[10px] font-black text-[#001b5e] uppercase tracking-widest">Processamento Ativo</span>
             </div>
             <p className="text-[9px] text-gray-500 font-bold uppercase">Módulo: Auditoria BPO</p>
          </div>
        </div>
      </div>

      {/* 3. Barra de Status Inferior (Estilo ERP DataCar) */}
      <div className="bg-[#d1e1f8] px-4 py-1.5 flex items-center justify-between border-t border-gray-300 text-[#001b5e]/70">
        <div className="flex items-center gap-8 text-[10px] font-bold">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            SESSÃO: ANALISTA_BPO_MASTER
          </div>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            CONEXÃO: SSL_ENCRYPTED_256
          </div>
          <div className="hidden sm:flex items-center gap-2">
            IP: 192.168.0.123
          </div>
        </div>
        <div className="text-[10px] font-black uppercase">
          Versão: 2025.01.07-STABLE
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default BrandingHeader;
