export function toBRL(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return (0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseVal(value: string | undefined | null): number {
  if (!value) return 0;

  const str = String(value);
  const isNegative = str.includes('-') || str.includes('(');

  // Get only the digits from the string
  const digitsOnly = str.replace(/\D/g, '');

  if (digitsOnly === '') return 0;

  // Assume the last two digits are cents
  const numberValue = parseFloat(digitsOnly) / 100;

  return isNegative ? -Math.abs(numberValue) : Math.abs(numberValue);
}

export function formatCurrencyInput(value: string | undefined | null): string {
  if (value === null || value === undefined) {
    return '';
  }
  const rawValue = String(value);
  const isNegative = rawValue.startsWith('-');
  
  let digitsOnly = rawValue.replace(/\D/g, '');

  if (!digitsOnly) {
    return isNegative ? '-' : '';
  }

  // By parsing to int and then to string, we remove leading zeros cleanly.
  // This also handles cases like "0" or "00" correctly.
  digitsOnly = parseInt(digitsOnly, 10).toString();

  // Pad with leading zeros if necessary for cents calculation
  if (digitsOnly.length < 3) {
    digitsOnly = digitsOnly.padStart(3, '0');
  }
  
  const integerPart = digitsOnly.slice(0, -2);
  const decimalPart = digitsOnly.slice(-2);
  const formattedIntegerPart = new Intl.NumberFormat('pt-BR').format(parseInt(integerPart, 10));
  
  const result = `${formattedIntegerPart},${decimalPart}`;
  
  return isNegative ? `-${result}` : result;
}


export function toBRLInput(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00';
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}