
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Group, AggregatedItem, DDA, Agendamento, Transferencia, Recebimento, Loja } from '../types';
import { toBRL } from '../utils/formatters';

export const exportFolhaToPdf = (items: Agendamento[], lojaNome: string) => {
    if (items.length === 0) {
        alert("⚠️ Nenhuma transação para exportar.");
        return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text(`Folha de Pagamento - ${lojaNome}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 21);

    const head = [["Colaborador", "Categoria", "Identificação (CPF / PIX)", "Vencimento", "Valor Líquido"]];
    const body = items.map(item => {
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

        return [
            item.fornecedor,
            item.categoriaFolha || 'SALÁRIO',
            identification,
            new Date(item.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
            toBRL(item.valor)
        ];
    });

    autoTable(doc, {
        head: head,
        body: body,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [31, 78, 120], textColor: [255, 255, 255] },
        styles: { font: 'helvetica', fontSize: 9 },
        columnStyles: { 4: { halign: 'right' } }
    });

    doc.save(`Folha_${lojaNome.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
};

export const exportToPdf = (system: Group, groupName: string) => {
    if (Object.keys(system.lojas).length === 0) {
        alert("⚠️ Nenhuma loja cadastrada para exportar.");
        return;
    }

    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text(`Relatório Financeiro – Pagamentos BPO (Grupo: ${groupName})`, 14, 22);

    // Generation Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

    // Summary Table
    const summaryHead = [["Loja / Saldo Inicial", "DDA", "Folha", "Agendamento", "Transferência", "Total Despesas", "Saldo Final", "Status"]];
    const summaryBody: (string | number)[][] = [];
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
        
        summaryBody.push([
            `${nome}\n${toBRL(loja.saldoInicial)}`,
            toBRL(totalDDA),
            toBRL(totalFolha),
            toBRL(totalAg),
            toBRL(totalTr),
            toBRL(totalDespesas),
            toBRL(saldoFinal),
            ''
        ]);
    });

    const summaryFoot = [[
        `TOTAL GERAL\n${toBRL(grandTotalSaldo)}`,
        toBRL(grandTotalDDA),
        toBRL(grandTotalFolha),
        toBRL(grandTotalAg),
        toBRL(grandTotalTr),
        toBRL(grandTotalDespesas),
        "",
        ""
    ]];

    autoTable(doc, {
        head: summaryHead,
        body: summaryBody,
        foot: summaryFoot,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [31, 78, 120], textColor: [255, 255, 255] },
        footStyles: { fillColor: [231, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { font: 'helvetica', fontSize: 7 },
        columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' },
        },
        willDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 6) {
                if (String(data.cell.raw).includes('-')) {
                    data.cell.styles.textColor = [156, 0, 6]; // Dark Red
                } else {
                    data.cell.styles.textColor = [0, 97, 0]; // Dark Green
                }
            }
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY || 100;

    // Detailed Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("DETALHADO", 14, finalY + 15);

    const detailHead = [["Tipo", "Beneficiário", "Descrição", "Data Pg.", "Valor", "Situação"]];
    const detailBody: any[][] = [];

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }
        return dateStr;
    };

    Object.entries(system.lojas).forEach(([nome, loja]) => {
        if (loja.dda.length === 0 && (loja.folha || []).length === 0 && loja.agend.length === 0 && loja.transf.length === 0) {
            return;
        }

        detailBody.push([
            { content: nome, colSpan: 6, styles: { fontStyle: 'bold', halign: 'center', fillColor: [217, 225, 242] } }
        ]);

        loja.dda.forEach(d => {
            detailBody.push([
                "DDA", d.benef, d.doc ? `Doc: ${d.doc}` : "", d.venc, toBRL(d.valor), (d.status ?? 'aberto') === 'pago' ? 'Agendado' : 'Em Aberto'
            ]);
        });

        (loja.folha || []).forEach(f => {
            detailBody.push([
                "FOLHA", f.fornecedor, f.descricao || "", formatDate(f.data), toBRL(f.valor), f.status === 'pago' ? 'Agendado' : 'Em Aberto'
            ]);
        });

        loja.agend.forEach(a => {
            const parts = [];
            if (a.descricao) parts.push(a.descricao);
            if (a.tipo !== 'PIX' || !a.chavePix) {
                parts.push(`Tipo: ${a.tipo}`);
            }
            if (a.chavePix) {
                parts.push(`Chave PIX: ${a.chavePix}`);
            }
            const descAgend = parts.join(' / ');
            
            const formattedDate = formatDate(a.data);
            
            detailBody.push([
                "Agendamento", a.fornecedor, descAgend, formattedDate, toBRL(a.valor), a.status === 'pago' ? 'Agendado' : 'Em Aberto'
            ]);
        });

        loja.transf.forEach(t => {
            const formattedDate = formatDate(t.data);

            detailBody.push([
                "Transferência", t.desc, `Origem: ${t.origem} / Destino: ${t.destino}`, formattedDate, toBRL(Math.abs(t.valor)), t.status === 'pago' ? 'Agendado' : 'Em Aberto'
            ]);
        });
    });

    autoTable(doc, {
        head: detailHead,
        body: detailBody,
        startY: finalY + 20,
        theme: 'grid',
        headStyles: { fillColor: [31, 78, 120], textColor: [255, 255, 255] },
        styles: { font: 'helvetica', fontSize: 8 },
        columnStyles: { 4: { halign: 'right' } },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.row.raw.length > 1 && data.column.index === 5 && data.cell.text && data.cell.text[0] === 'Em Aberto') {
                doc.setFillColor(255, 199, 206); // Light Red
                doc.rect(data.cell.x, data.cell.y, data.column.width, data.cell.height, 'F');
                doc.setTextColor(156, 0, 6); // Dark Red Text
                doc.text(String(data.cell.text), data.cell.x + 2, data.cell.y + data.cell.height / 2, {
                    baseline: 'middle'
                });
            }
        },
    });

    doc.save(`Relatorio_Pagamentos_BPO_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
};

export const exportTransactionsToPdf = (items: AggregatedItem[], groupName: string, allLojas: { [key: string]: Loja }) => {
    if (items.length === 0) {
        alert("⚠️ Nenhuma transação para exportar.");
        return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

    doc.setFontSize(16);
    doc.text(`Relatório de Transações - ${groupName}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 21);

    const head = [["Loja", "Tipo", "Beneficiário/Origem", "Descrição", "Situação", "Data Pg.", "Valor"]];
    const body: any[][] = [];
    let total = 0;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }
        return dateStr;
    };

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
                benef = `De: ${originTransfer?.origem || 'N/A'}`; 
                desc = '-'; 
                situacao = 'Recebido'; 
                dataPg = originTransfer ? formatDate(originTransfer.data) : '-'; 
                valor = r.valor;
                break;
            default: return;
        }

        total += valor;
        body.push([lojaNome, type.toUpperCase(), benef, desc, situacao, dataPg, toBRL(valor)]);
    });

    autoTable(doc, {
        head: head,
        body: body,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [31, 78, 120], textColor: [255, 255, 255] },
        styles: { font: 'helvetica', fontSize: 8 },
        columnStyles: { 
            6: { halign: 'right' } 
        },
        willDrawCell: (data) => {
             if (data.section === 'body' && data.column.index === 6) {
                const valStr = String(data.cell.raw);
                if (valStr.includes('-')) {
                    data.cell.styles.textColor = [156, 0, 6]; 
                } else {
                    data.cell.styles.textColor = [0, 97, 0]; 
                }
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total: ${toBRL(total)}`, 14, finalY);

    doc.save(`Transacoes_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
}
