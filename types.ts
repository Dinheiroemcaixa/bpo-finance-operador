
// Defines the structure for a DDA (Débito Direto Autorizado) entry.
export interface DDA {
  benef: string;
  doc: string;
  venc: string;
  valor: number;
  status?: 'aberto' | 'pago';
}

// Defines the structure for a scheduled payment.
export interface Agendamento {
  fornecedor: string;
  tipo: 'PIX' | 'Boleto' | 'Recibo' | 'NF-e' | 'Cheque' | 'Guia' | 'Outros';
  valor: number;
  chavePix?: string;
  cpf?: string;
  status: 'aberto' | 'pago';
  data: string;
  descricao?: string;
  categoriaFolha?: 'SALÁRIO' | 'ADIANTAMENTO SALARIAL' | 'GRATIFICAÇÃO' | '13°';
  anexo?: string; // URL do arquivo anexado no Supabase Storage
}

// Defines a transfer between stores.
export interface Transferencia {
    id: number;
    origem: string;
    destino: string;
    data: string;
    valor: number;
    desc: string;
    status: 'aberto' | 'pago';
}

// Defines a receipt from a transfer.
export interface Recebimento {
    id: number;
    valor: number;
}

// Defines a store's financial data.
export interface Loja {
  saldoInicial: number;
  // Active entries for the current period
  dda: DDA[];
  folha: Agendamento[]; // Novo campo para folha agrupada
  agend: Agendamento[];
  transf: Transferencia[];
  receb: Recebimento[];
  data: string; // Creation date of the store
  // Archived entries from previous periods
  history: {
    dda: DDA[];
    folha: Agendamento[];
    agend: Agendamento[];
    transf: Transferencia[];
    receb: Recebimento[];
  };
}

// Defines a supplier, used in scheduled payments.
export interface Supplier {
  id: string;
  name: string;
  cpf?: string;
  chavePix?: string;
}

// Defines a rule for payment alerts (e.g., auto-debit warnings)
export interface PaymentRule {
  id: string;
  term: string; // The term to match in name/description (optional if others are present)
  matchDoc?: string; // Optional: Match specific document/CNPJ/CPF
  matchValue?: number; // Optional: Match specific value
  matchDate?: string; // Optional: Match specific due date (YYYY-MM-DD)
  alertMessage: string; // The warning message
  isRecurring?: boolean; // If true, indicates auto-debit/recurring payment
}

// Defines a group of stores.
export interface Group {
  lojas: { [key: string]: Loja };
  fornecedores: Supplier[];
  paymentRules: PaymentRule[];
}

// Defines the top-level structure for all groups.
export interface Groups {
  [key: string]: Group;
}

// Defines a unified item type for the transactions view.
export interface AggregatedItem {
  lojaNome: string;
  type: 'dda' | 'agend' | 'transf' | 'receb' | 'folha';
  data: DDA | Agendamento | Transferencia | Recebimento;
}

// Defines a System Operator
export interface Operator {
  id: string;
  name: string;
  pin: string; // 4-digit access code
  email?: string;
}
