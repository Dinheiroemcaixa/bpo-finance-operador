
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import saveAs from 'file-saver';
import { Loja, Group, DDA, AggregatedItem, Agendamento, Transferencia, Recebimento } from '../types';
import { toBRL } from '../utils/formatters';

export const processExcelFile = (file: File): Promise<DDA[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
        
        const ddaList: DDA[] = rows.map(r => {
          const benef = r["Nome/Razão Social do Beneficiário"]?.trim();
          const doc = r["Nº do Documento"]?.toString().trim();
          const venc = r["Vencimento"]?.trim();
          let valor = r["Valor a Pagar (R$)"];

          if (typeof valor === "string") {
            valor = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
          }

          if (benef && valor > 0) {
            return { benef, doc, venc, valor, status: 'aberto' };
          }
          return null;
        }).filter((item): item is DDA => item !== null);
        
        resolve(ddaList);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const exportFolhaToExcel = async (items: Agendamento[], lojaNome: string) => {
    if (items.length === 0) {
        alert("⚠️ Nenhuma transação para exportar.");
        return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Folha de Pagamento", {
        pageSetup: {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1
        }
    });

    ws.mergeCells("A1:E1");
    const titleCell = ws.getCell("A1");
    titleCell.value = `Folha de Pagamento - ${lojaNome}`;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    ws.addRow([]);

    const header = ["Colaborador", "Categoria", "Identificação (CPF / PIX)", "Vencimento", "Valor Líquido"];
    const headerRow = ws.addRow(header);
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    items.forEach(item => {
        // Limpa a descrição para mostrar apenas CPF e adiciona PIX
        const identParts = [];
        if (item.descricao) {
            const cleanCpf = item.descricao.replace('Folha de Pagamento - ', '');
            identParts.push(cleanCpf);
        }
        if (item.chavePix) {
            identParts.push(`PIX: ${item.chavePix}`);
        }
        const identification = identParts.join(' / ') || '-';

        const row = ws.addRow([
            item.fornecedor,
            item.categoriaFolha || 'SALÁRIO',
            identification,
            new Date(item.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
            item.valor
        ]);
        row.eachCell((cell, colNum) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle', wrapText: true };
            if (colNum === 5) {
                cell.numFmt = '"R$"#,##0.00';
                cell.alignment = { horizontal: 'right' };
            }
        });
    });

    ws.columns = [
        { width: 35 }, { width: 25 }, { width: 45 }, { width: 15 }, { width: 20 }
    ];

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Folha_${lojaNome.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
};

export const exportToExcel = async (system: Group, groupName: string) => {
    if (Object.keys(system.lojas).length === 0) {
        alert("⚠️ Nenhuma loja cadastrada para exportar.");
        return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Relatório Financeiro", {
        pageSetup: {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: {
                left: 0.5, right: 0.5, top: 0.75, bottom: 0.75,
                header: 0.3, footer: 0.3
            }
        }
    });

    ws.mergeCells("A1:H3");
    const logoCell = ws.getCell("A1");
    logoCell.value = "";
    logoCell.alignment = { horizontal: "center", vertical: "middle" };
    logoCell.font = { size: 16, bold: true };
    
    ws.mergeCells("A4:H4");
    const titleCell = ws.getCell("A4");
    titleCell.value = `Relatório Financeiro – Pagamentos BPO (Grupo: ${groupName})`;
    titleCell.alignment = { horizontal: "center" };
    titleCell.font = { size: 14, bold: true };

    ws.mergeCells("A5:H5");
    const dateCell = ws.getCell("A5");
    dateCell.value = `Gerado em: ${new Date().toLocaleString("pt-BR")}`;
    dateCell.alignment = { horizontal: "center" };
    dateCell.font = { italic: true, size: 11, color: { argb: "FF555555" } };

    ws.addRow([]);

    const headerResumo = ["Loja / Saldo Inicial", "DDA", "Folha", "Agendamento", "Transferência", "Total Despesas", "Saldo Final", "Status"];
    const headerRowResumo = ws.addRow(headerResumo);
    headerRowResumo.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    let isZebra = false;
    let grandTotalSaldo = 0, grandTotalDDA = 0, grandTotalFolha = 0, grandTotalAg = 0, grandTotalTr = 0, grandTotalDespesas = 0;

    Object.entries(system.lojas).forEach(([nome, loja]) => {
        const totalDDA = loja.dda.reduce((acc, item) => acc + item.valor, 0);
        const totalFolha = (loja.folha || []).reduce((acc, item) => acc + item.valor, 0);
        const totalAg = loja.agend.reduce((acc, item) => acc + item.valor, 0);
        const totalTr = loja.transf.reduce((acc, item) => acc + Math.abs(item.valor), 0);
        const totalDespesas = totalDDA + totalFolha + totalAg + totalTr;
        const totalReceb = loja.receb.reduce((acc, item) => acc + item.valor, 0);
        const saldoFinal = loja.saldoInicial - totalDespesas + totalReceb;

        grandTotalSaldo += loja.saldoInicial;
        grandTotalDDA += totalDDA;
        grandTotalFolha += totalFolha;
        grandTotalAg += totalAg;
        grandTotalTr += totalTr;
        grandTotalDespesas += totalDespesas;

        const row = ws.addRow([
            `${nome}\n${toBRL(loja.saldoInicial)}`,
            totalDDA,
            totalFolha,
            totalAg,
            totalTr,
            totalDespesas,
            saldoFinal,
            ''
        ]);
        
        row.getCell(1).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
        
        [2, 3, 4, 5, 6, 7].forEach(colNum => {
            const cell = row.getCell(colNum);
            cell.numFmt = '"R$"#,##0.00';
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
        });

        const saldoFinalCell = row.getCell(7);
        if (saldoFinal >= 0) {
            saldoFinalCell.font = { color: { argb: '006100' } };
        } else {
            saldoFinalCell.font = { color: { argb: '9C0006' } };
        }

        if (isZebra) {
            row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
            });
        }
        row.eachCell(cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } });
        isZebra = !isZebra;
    });

    const totalRow = ws.addRow([
        `TOTAL GERAL\n${toBRL(grandTotalSaldo)}`, grandTotalDDA, grandTotalFolha, grandTotalAg, grandTotalTr, grandTotalDespesas, "", ""
    ]);
    totalRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E7E6E6' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (colNumber === 1) {
            cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
        } else if (colNumber >= 2 && colNumber <= 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
             cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
    });
    [2, 3, 4, 5, 6].forEach(colNum => {
        totalRow.getCell(colNum).numFmt = '"R$"#,##0.00';
    });

    ws.addRow([]);
    ws.addRow(["DETALHADO"]).font = { size: 14, bold: true };
    
    const detailStartRow = ws.rowCount + 1;

    Object.entries(system.lojas).forEach(([nome, loja]) => {
        if (loja.dda.length === 0 && (loja.folha || []).length === 0 && loja.agend.length === 0 && loja.transf.length === 0) {
            return;
        }

        ws.addRow([]); 
        const storeHeaderRow = ws.addRow([nome]);
        ws.mergeCells(`A${storeHeaderRow.number}:F${storeHeaderRow.number}`);
        storeHeaderRow.getCell(1).font = { bold: true, size: 12 };
        storeHeaderRow.getCell(1).alignment = { horizontal: 'center' };
        storeHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } };

        const headerDetalhe = ["Tipo", "Beneficiário", "Descrição", "Data Pg.", "Valor", "Situação"];
        const headerRowDetalhe = ws.addRow(headerDetalhe);
        headerRowDetalhe.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        const applyDetailRowStyles = (row: ExcelJS.Row) => {
            row.eachCell((cell, colNumber) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { vertical: 'middle', wrapText: true };
                switch(colNumber) {
                    case 1: case 2: case 3:
                        cell.alignment.horizontal = 'left';
                        break;
                    case 4: 
                        cell.alignment.horizontal = 'center';
                        break;
                    case 6:
                        cell.alignment.horizontal = 'center';
                        break;
                    case 5:
                        cell.alignment.horizontal = 'right';
                        cell.numFmt = '"R$"#,##0.00';
                        break;
                }
            });
        };

        const formatDate = (dateStr: string) => {
            if (!dateStr) return "";
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-');
                return `${day}/${month}/${year}`;
            }
            return dateStr;
        };

        loja.dda.forEach(d => {
            const descDDA = d.doc ? `Doc: ${d.doc}` : "";
            const r = ws.addRow(["DDA", d.benef, descDDA, d.venc, d.valor, (d.status ?? 'aberto') === 'pago' ? 'Agendado' : 'Em Aberto']);
            applyDetailRowStyles(r);
        });

        (loja.folha || []).forEach(f => {
            const parts = [];
            if (f.descricao) parts.push(f.descricao);
            if (f.chavePix) parts.push(`PIX: ${f.chavePix}`);
            const descFolha = parts.join(' / ');
            const formattedDate = formatDate(f.data);
            const r = ws.addRow(["FOLHA", f.fornecedor, descFolha, formattedDate, f.valor, f.status === 'pago' ? 'Agendado' : 'Em Aberto']);
            applyDetailRowStyles(r);
        });

        loja.agend.forEach(a => {
            const parts = [];
            if (a.descricao) parts.push(a.descricao);
            if (a.tipo !== 'PIX' || !a.chavePix) parts.push(`Tipo: ${a.tipo}`);
            if (a.chavePix) parts.push(`Chave PIX: ${a.chavePix}`);
            const descAgend = parts.join(' / ');
            const formattedDate = formatDate(a.data);
            const r = ws.addRow(["Agendamento", a.fornecedor, descAgend, formattedDate, a.valor, a.status === "pago" ? "Agendado" : "Em Aberto"]);
            applyDetailRowStyles(r);
        });

        loja.transf.forEach(t => {
            const descTransf = `Origem: ${t.origem} / Destino: ${t.destino}`;
            const formattedDate = formatDate(t.data);
            const r = ws.addRow(["Transferência", t.desc, descTransf, formattedDate, Math.abs(t.valor), t.status === "pago" ? "Agendado" : "Em Aberto"]);
            applyDetailRowStyles(r);
        });
    });

    const endRow = ws.rowCount;
    if (endRow >= detailStartRow) {
        ws.addConditionalFormatting({
            ref: `A${detailStartRow}:F${endRow}`,
            rules: [
                {
                    type: 'expression',
                    formulae: [`$F${detailStartRow}="Em Aberto"`],
                    style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } } },
                }
            ]
        });
    }

    ws.columns = [
        { width: 25 }, { width: 35 }, { width: 45 }, { width: 15 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 15 }
    ];

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Relatorio_Pagamentos_BPO_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
};

export const exportTransactionsToExcel = async (items: AggregatedItem[], groupName: string, allLojas: { [key: string]: Loja }) => {
    if (items.length === 0) {
        alert("⚠️ Nenhuma transação para exportar.");
        return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Transações", {
        pageSetup: {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
        }
    });

    ws.mergeCells("A1:G1");
    const titleCell = ws.getCell("A1");
    titleCell.value = `Relatório de Transações - ${groupName}`;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    ws.mergeCells("A2:G2");
    const dateCell = ws.getCell("A2");
    dateCell.value = `Gerado em: ${new Date().toLocaleString("pt-BR")}`;
    dateCell.alignment = { horizontal: "center" };
    dateCell.font = { italic: true, size: 10, color: { argb: "FF555555" } };

    ws.addRow([]);

    const header = ["Loja", "Tipo", "Beneficiário/Origem", "Descrição", "Situação", "Data Pg.", "Valor"];
    const headerRow = ws.addRow(header);
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }
        return dateStr;
    };

    let total = 0;

    items.forEach(item => {
        const { lojaNome, type, data } = item;
        let benef, desc, situacao, dataPg, valor;

        switch (type) {
            case 'dda':
                const d = data as DDA;
                benef = d.benef; 
                desc = d.doc ? `Doc: ${d.doc}` : ''; 
                situacao = (d.status || 'aberto') === 'pago' ? 'Agendado' : 'Em Aberto'; 
                dataPg = d.venc; 
                valor = -d.valor;
                break;
            case 'folha':
            case 'agend':
                const a = data as Agendamento;
                benef = a.fornecedor; 
                desc = a.descricao || '-'; 
                situacao = a.status === 'pago' ? 'Agendado' : 'Em Aberto'; 
                dataPg = formatDate(a.data);
                valor = -a.valor;
                break;
            case 'transf':
                const t = data as Transferencia;
                benef = t.desc; 
                desc = `Origem: ${t.origem} / Destino: ${t.destino}`; 
                situacao = t.status === 'pago' ? 'Agendado' : 'Em Aberto'; 
                dataPg = formatDate(t.data);
                valor = -Math.abs(t.valor);
                break;
            case 'receb':
                const r = data as Recebimento;
                const originTransfer = (Object.values(allLojas) as Loja[]).flatMap(l => l.transf).find(t => t.id === r.id);
                benef = `De: ${originTransfer?.origem || 'Desconhecido'}`; 
                desc = '-'; 
                situacao = 'Recebido'; 
                dataPg = originTransfer ? formatDate(originTransfer.data) : '-'; 
                valor = r.valor;
                break;
            default:
                return;
        }

        total += valor;
        const r = ws.addRow([lojaNome, type.toUpperCase(), benef, desc, situacao, dataPg, valor]);
        
        r.eachCell((cell, colNum) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (colNum === 6) cell.alignment = { horizontal: 'center' };
            if (colNum === 7) {
                cell.numFmt = '"R$"#,##0.00';
                cell.alignment = { horizontal: 'right' };
                cell.font = { color: { argb: valor < 0 ? '9C0006' : '006100' } };
            }
        });
    });

    ws.addRow([]);
    const totalRow = ws.addRow(["TOTAL GERAL", "", "", "", "", "", total]);
    totalRow.eachCell((cell, colNum) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E7E6E6' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (colNum === 7) {
            cell.numFmt = '"R$"#,##0.00';
            cell.font = { bold: true, color: { argb: total < 0 ? '9C0006' : '006100' } };
        }
    });
    
    ws.columns = [
        { width: 20 }, { width: 15 }, { width: 30 }, { width: 35 }, { width: 15 }, { width: 15 }, { width: 20 },
    ];

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Transacoes_${groupName}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
}
