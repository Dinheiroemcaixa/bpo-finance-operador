
import { GoogleGenAI, Type } from "@google/genai";
import { DDA, Agendamento } from '../types';
import { parseVal } from "../utils/formatters";
import * as XLSX from 'xlsx';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

export const processDdaImage = async (file: File): Promise<DDA[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = await fileToBase64(file);
    
    const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            benef: { type: Type.STRING, description: "Nome ou razão social do beneficiário" },
            doc: { type: Type.STRING, description: "Número do documento" },
            venc: { type: Type.STRING, description: "Data de vencimento no formato DD/MM/AAAA" },
            valor: { type: Type.STRING, description: "Valor a pagar, como uma string com pontuação (ex: '1.234,56')" },
          },
          required: ['benef', 'venc', 'valor']
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: file.type,
                        data: base64Data,
                    },
                },
                {
                    text: `
                        Analise a imagem de uma lista de pagamentos. Sua tarefa é extrair os detalhes de CADA linha que representa um boleto ou pagamento a ser feito. Seja o mais completo possível e não omita nenhuma linha.

                        Para cada linha de pagamento individual, extraia as seguintes informações:
                        1.  'Nome / razão social do beneficiário': O nome da empresa ou pessoa a ser paga. Mapeie para a chave 'benef'.
                        2.  'Nº do documento': O número de identificação do pagamento. Extraia o conteúdo exatamente como aparece. Mapeie para a chave 'doc'. Se estiver vazio, use uma string vazia.
                        3.  'Vencimento': A data de vencimento. Mapeie para a chave 'venc' no formato DD/MM/AAAA.
                        4.  'Valor a pagar': O valor monetário do pagamento. Mapeie para a chave 'valor' como uma string, mantendo a formatação original com pontos e vírgulas (ex: '1.491,86').

                        Ignore as linhas de cabeçalho da tabela e a linha de "Total" no final.
                        Formate a saída como un array JSON seguindo o schema fornecido.
                    `,
                },
            ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    const jsonString = response.text;
    const parsedData: any[] = JSON.parse(jsonString);

    return parsedData.map(item => ({
        benef: item.benef?.trim() || 'N/A',
        doc: item.doc?.toString().trim() || '',
        venc: item.venc?.trim() || '',
        valor: parseVal(item.valor),
        status: 'aberto' as const
    })).filter(item => item.valor > 0);

  } catch (error) {
    console.error("Erro ao processar imagem com Gemini:", error);
    throw new Error("Não foi possível extrair dados da imagem.");
  }
};

export const processBoletoImage = async (file: File): Promise<{fornecedor: string, data: string, valor: number}> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = await fileToBase64(file);
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            fornecedor: { type: Type.STRING, description: "Nome do beneficiário." },
            data: { type: Type.STRING, description: "Vencimento no formato DD/MM/AAAA." },
            valor: { type: Type.STRING, description: "Valor do documento (ex: '1.234,56')." },
        },
        required: ['fornecedor', 'data', 'valor']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: "Extraia o Fornecedor (beneficiário), Data de Vencimento e Valor do boleto/guia." }
            ]
        },
        config: { responseMimeType: "application/json", responseSchema: responseSchema }
    });

    const parsedData: any = JSON.parse(response.text);
    let dateStr = parsedData.data;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    return {
        fornecedor: parsedData.fornecedor.trim(),
        data: dateStr,
        valor: parseVal(parsedData.valor),
    };
  } catch (error) {
    console.error("Erro ao processar boleto:", error);
    throw new Error("Falha ao analisar o boleto.");
  }
};

export const processSalaryReportImage = async (file: File): Promise<Omit<Agendamento, 'status' | 'tipo'>[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = await fileToBase64(file);
    
    const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.STRING },
            cpf: { type: Type.STRING },
            valor: { type: Type.STRING },
            data: { type: Type.STRING },
            categoria: { type: Type.STRING, enum: ['SALÁRIO', 'ADIANTAMENTO SALARIAL', 'GRATIFICAÇÃO', '13°'] }
          },
          required: ['nome', 'valor', 'data', 'categoria']
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: "Extraia Nome, CPF e Valor Líquido de cada pessoa no relatório de líquidos de folha de pagamento." }
            ]
        },
        config: { responseMimeType: "application/json", responseSchema: responseSchema }
    });

    const parsedData: any[] = JSON.parse(response.text);
    return parsedData.map(item => {
        let formattedDate = new Date().toISOString().split('T')[0];
        if (item.data && item.data.includes('/')) {
            const parts = item.data.split('/');
            if (parts.length === 3) {
                formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        return {
            fornecedor: item.nome?.trim() || 'Colaborador',
            valor: parseVal(item.valor),
            data: formattedDate,
            cpf: item.cpf?.trim() || '',
            descricao: `Folha de Pagamento - CPF: ${item.cpf || 'N/I'}`,
            categoriaFolha: item.categoria || 'SALÁRIO'
        };
    }).filter(item => item.valor > 0);
  } catch (error) {
    throw new Error("Falha ao analisar o relatório de líquidos.");
  }
};

export const processSalaryExcel = async (file: File): Promise<Omit<Agendamento, 'status' | 'tipo'>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_csv(worksheet);

          const responseSchema = {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                cpf: { type: Type.STRING },
                valor: { type: Type.STRING },
                chavePix: { type: Type.STRING },
                categoria: { type: Type.STRING, enum: ['SALÁRIO', 'ADIANTAMENTO SALARIAL', 'GRATIFICAÇÃO', '13°'] }
              },
              required: ['nome', 'valor', 'categoria']
            }
          };

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analise estes dados de planilha e extraia colaboradores (Nome, CPF), salários líquidos e chaves PIX:\n${csvData}`,
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
          });

          const parsedData: any[] = JSON.parse(response.text);
          resolve(parsedData.map(item => ({
            fornecedor: item.nome?.trim() || 'Colaborador',
            valor: parseVal(item.valor),
            data: new Date().toISOString().split('T')[0],
            cpf: item.cpf?.trim() || '',
            chavePix: item.chavePix?.trim() || '',
            descricao: `Importado via Planilha Excel`,
            categoriaFolha: item.categoria || 'SALÁRIO'
          })).filter(item => item.valor > 0));
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
};
