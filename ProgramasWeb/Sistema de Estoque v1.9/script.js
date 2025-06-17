// script.js - Sistema de Estoque com notificações pop-up chamativas
// Atualizado em 03/06/2025: adicionado fundo animado em CSS e pop-ups estilosos
// Autor: Fernando

// ==================== 1. Definições iniciais ====================

// Lista de materiais disponíveis para estoque
const materials = [
  { id: 'NXH-1.14-1067x800', nome: 'NXH 1.14 1067x800', placasPorCaixa: 20 },
  { id: 'NXH-1.14-762x610', nome: 'NXH 1.14 762x610', placasPorCaixa: 20 },
  { id: 'TIL-KODAK-1097x838', nome: 'TIL KODAK 1097x838', placasPorCaixa: 20 },
  { id: 'TIL-KODAK-838x750', nome: 'TIL KODAK 838x750', placasPorCaixa: 20 },
  { id: 'TIL-DITR-1097x838', nome: 'TIL DITR 1097x838', placasPorCaixa: 20 },
  { id: 'TIL-DITR-838x750', nome: 'TIL DITR 838x750', placasPorCaixa: 20 },
  { id: 'ESXR-1.14-1524x1067', nome: 'ESXR 1.14 1524x1067', placasPorCaixa: 12 },
  { id: 'ESXR-1.14-1200x900', nome: 'ESXR 1.14 1200x900', placasPorCaixa: 20 },
  { id: 'FAH-2.84-1524x1067', nome: 'FAH 2.84 1524x1067', placasPorCaixa: 10 },
  { id: 'FAH-2.84-900x1200', nome: 'FAH 2.84 900x1200', placasPorCaixa: 10 },
  { id: 'EPC-2.84-1524x1067', nome: 'EPC 2.84 1524x1067', placasPorCaixa: 8 },
  { id: 'DPR-1.7-1200x900', nome: 'DPR 1.7 1200x900', placasPorCaixa: 17 },
  { id: 'DPR-1.7-1524x1067', nome: 'DPR 1.7 1524x1067', placasPorCaixa: 10 },
  { id: 'DEC-6.35-1524x1067', nome: 'DEC 6.35 1524x1067', placasPorCaixa: 4 }
];

// Armazena todos os registros e saldos por material
let dataStore = {}, currentTab = materials[0].id, showType = 'all';

// Nomes de meses usados nos filtros e relatórios
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ==================== 2. Inicialização ao carregar a página ====================

// Função chamada ao terminar de carregar o DOM
function init() {
  // Carrega ou inicializa o localStorage
  dataStore = JSON.parse(localStorage.getItem('estoque')) || {};
  materials.forEach(m => {
    if (!dataStore[m.id]) {
      dataStore[m.id] = { registros: {}, saldo: 0 };
    }
  });

  renderTabs();        // Cria as abas de seleção de material
  setupFilters();      // Configura eventos dos botões básicos
  openTab(currentTab); // Abre a primeira aba por padrão
}

// Atualiza relógio no rodapé a cada segundo
function atualizarRelogio() {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2,'0');
  const mes = String(agora.getMonth()+1).padStart(2,'0');
  const ano = agora.getFullYear();
  const horas = String(agora.getHours()).padStart(2,'0');
  const minutos = String(agora.getMinutes()).padStart(2,'0');
  const segundos = String(agora.getSeconds()).padStart(2,'0');
  document.getElementById('horaAtual').textContent = `${dia}/${mes}/${ano} — ${horas}:${minutos}:${segundos}`;
}

// Chama init() assim que o DOM for carregado
document.addEventListener('DOMContentLoaded', init);
setInterval(atualizarRelogio, 1000);

// ==================== 3. Renderização das abas de materiais ====================

function renderTabs() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  materials.forEach(m => {
    const btn = document.createElement('button');
    btn.textContent = m.nome;
    btn.dataset.id = m.id;
    btn.onclick = () => openTab(m.id);
    if (m.id === currentTab) btn.classList.add('active');
    tabs.appendChild(btn);
  });
}

// Abre a aba do material selecionado, atualiza visual e conteúdo
function openTab(id) {
  currentTab = id;
  document.querySelectorAll('.tabs button').forEach(b => {
    b.classList.toggle('active', b.dataset.id === id);
  });
  renderContent();
}

// ==================== 4. Configuração de filtros e botões principais ====================

function setupFilters() {
  document.getElementById('showEntries').onclick = () => { showType = 'entrada'; renderContent(); };
  document.getElementById('showExits').onclick   = () => { showType = 'retirada'; renderContent(); };
  document.getElementById('clearFilters').onclick = () => { showType = 'all'; renderContent(); };
  document.getElementById('calcAvg').onclick      = calculateAverage;
  document.getElementById('generatePDF').onclick  = gerarPDF;
  document.getElementById('calcDuracao').onclick  = calcularDuracaoEstoque;
}

// ==================== 5. Renderização do conteúdo da aba atual ====================

function renderContent() {
  const sec = document.getElementById('tab-content');
  sec.innerHTML = '';
  const regs = dataStore[currentTab].registros;
  const qtdMinima = materials.find(m => m.id === currentTab).placasPorCaixa;
  const saldoAtual = dataStore[currentTab].saldo;

  // ALERTA DE ESTOQUE BAIXO (se saldo < mínimo)
  if (saldoAtual < qtdMinima) {
    const alerta = document.createElement('div');
    alerta.innerHTML = `
      <strong>🚨 ALERTA DE ESTOQUE BAIXO 🚨</strong><br>
      <span>Apenas ${saldoAtual} placas disponíveis — o mínimo é ${qtdMinima}!</span>
    `;
    alerta.className = 'alerta-baixo';
    sec.appendChild(alerta);
  }

  // ===== Controles de entrada/retirada =====
  const ctr = document.createElement('div');
  ctr.className = 'section-controls';

  // Input para placas avulsas
  const ip = document.createElement('input');
  ip.type = 'number';
  ip.placeholder = 'Placas';
  const bi = document.createElement('button');
  bi.textContent = 'Entrada';
  // Quando clicar em Entrada avulsa, pop-up e adiciona registro
  bi.onclick = () => {
    showNotification('Adicionando placas...', 'success');
    addRecord('entrada', +ip.value, '');
  };

  // Input para caixas (multiplica pela qtd mínima)
  const ic = document.createElement('input');
  ic.type = 'number';
  ic.placeholder = 'Caixas';
  const bc = document.createElement('button');
  bc.textContent = 'Entrada Caixas';
  // Quando clicar em Entrada Caixas, pop-up e adiciona registro
  bc.onclick = () => {
    showNotification('Adicionando placas...', 'success');
    const placasTotal = +ic.value * qtdMinima;
    addRecord('entrada', placasTotal, prompt('Lote:'));
  };

  // Input para retiradas
  const op = document.createElement('input');
  op.type = 'number';
  op.placeholder = 'Retirada';
  const bo = document.createElement('button');
  bo.textContent = 'Retirada';
  // Quando clicar em Retirada, pede confirmação, pop-up e adiciona registro
  bo.onclick = () => {
    const qtd = +op.value;
    if (!qtd || qtd <= 0) {
      showNotification('Número inválido para retirada.', 'error');
      return;
    }
    if (confirm('Tem certeza que deseja retirar?')) {
      showNotification('Retirando placas...', 'info');
      addRecord('retirada', qtd, '');
    }
  };

  [ip, bi, ic, bc, op, bo].forEach(e => ctr.appendChild(e));
  sec.appendChild(ctr);

  // ===== Filtros de Mês e Dia =====
  const mf = document.getElementById('monthFilter');
  const df = document.getElementById('dayFilter');

  // Monta opções de meses existentes
  const meses = Object.keys(regs).sort();
  mf.innerHTML = '<option value="all">Todos</option>' +
    meses.map(m => {
      const [y, mo] = m.split('-');
      return `<option value="${m}"${mf.value === m ? ' selected' : ''}>
                ${monthNames[parseInt(mo)-1]}/${y}
              </option>`;
    }).join('');

  // Monta opções de dias existentes
  let dias = [];
  meses.forEach(m => dias.push(...Object.keys(regs[m])));
  dias = [...new Set(dias)].sort();
  df.innerHTML = '<option value="all">Todos</option>' +
    dias.map(d => `<option value="${d}"${df.value===d ? ' selected':''}>${d}</option>`).join('');

  // ===== Criação dos blocos de meses e dias com tabelas =====
  const filtroMes = mf.value;
  const filtroDia = df.value;

  meses.forEach(m => {
    if (filtroMes !== 'all' && filtroMes !== m) return;

    // Bloco de cada mês
    const blocoMes = document.createElement('div');
    blocoMes.className = 'mes-bloco';
    const tituloMes = document.createElement('h3');
    tituloMes.textContent = `${monthNames[parseInt(m.split('-')[1]) - 1]}/${m.split('-')[0]}`;
    blocoMes.appendChild(tituloMes);

    // Para cada dia daquele mês
    Object.keys(regs[m]).sort().forEach(dia => {
      if (filtroDia !== 'all' && filtroDia !== dia) return;

      // Container de dropdown para o dia
      const wrap = document.createElement('div');
      wrap.className = 'dia-dropdown';
      const header = document.createElement('div');
      header.className = 'dropdown-header';
      const icon = document.createElement('span');
      icon.textContent = '▶';
      icon.className = 'dropdown-icon';
      const label = document.createElement('span');
      label.textContent = `Dia ${dia}`;
      header.append(icon, label);
      wrap.append(header);

      // Conteúdo interno: tabela de registros daquele dia
      const content = document.createElement('div');
      content.className = 'dropdown-content';
      const tbl = document.createElement('table');
      tbl.className = 'record-table';
      tbl.innerHTML = `
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Placas</th>
            <th>Lote</th>
            <th>Data</th>
            <th>Excluir</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tb = tbl.querySelector('tbody');

      // Preenche cada registro naquela data
      regs[m][dia].forEach((r, index) => {
        if (showType === 'all' || showType === r.tipo) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${r.tipo}</td>
            <td contenteditable>${r.placas}</td>
            <td contenteditable>${r.lote}</td>
            <td>${r.data}</td>
            <td>
              <button class="btn-delete"> 
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M9 3v1H4v2h1v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zm2 3h2v12h-2V6zm4 0h2v12h-2V6zm-8 0h2v12H7V6z"/>
                </svg>
              </button>
            </td>
          `;

          // Atualiza quantidade se editado
          tr.cells[1].onblur = () => {
            r.placas = parseInt(tr.cells[1].textContent) || r.placas;
            recalc();
            save();
            renderContent();
          };
          // Atualiza lote se editado
          tr.cells[2].onblur = () => {
            r.lote = tr.cells[2].textContent;
            save();
          };
          // Ao clicar em excluir, pede confirmação, remove e notifica
          tr.querySelector('.btn-delete').onclick = () => {
            if (confirm('Tem certeza que deseja excluir este registro?')) {
              regs[m][dia].splice(index, 1); // remove do array
              // se não sobrou nenhum naquele dia, limpa chave
              if (regs[m][dia].length === 0) {
                delete regs[m][dia];
                // se mês ficar sem dias, remove o mês
                if (Object.keys(regs[m]).length === 0) {
                  delete regs[m];
                }
              }
              recalc();
              save();
              showNotification('Registro excluído.', 'error');
              renderContent();
            }
          };

          tb.appendChild(tr);
        }
      });

      content.appendChild(tbl);
      wrap.append(content);
      header.onclick = () => wrap.classList.toggle('open');
      if (filtroDia !== 'all' && filtroDia === dia) wrap.classList.add('open');

      blocoMes.appendChild(wrap);
    });

    sec.appendChild(blocoMes);
  });

  // Exibe o saldo atual
  const tot = document.createElement('div');
  tot.className = 'total-balance';
  tot.textContent = `Saldo: ${dataStore[currentTab].saldo} placas`;
  sec.appendChild(tot);
}

// ==================== 6. Funções de notificação ====================

function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  const notif = document.createElement('div');
  notif.className = `notification ${type}`;
  notif.textContent = message;
  container.appendChild(notif);
  // Remove após animação de 3.4s (0.4s entrada + 3s visível)
  setTimeout(() => {
    notif.remove();
  }, 3400);
}

// ==================== 7. Funções de cálculo e relatórios ====================

// Recalcula o saldo total do material atual
function recalc() {
  let s = 0;
  Object.values(dataStore[currentTab].registros).forEach(days => {
    Object.values(days).forEach(arr => {
      arr.forEach(r => {
        s += (r.tipo === 'entrada' ? r.placas : -r.placas);
      });
    });
  });
  dataStore[currentTab].saldo = s;
}

// Calcula média de retiradas entre datas selecionadas
function calculateAverage() {
  const sd = document.getElementById('startDate').value;
  const ed = document.getElementById('endDate').value;
  if (!sd || !ed) {
    showNotification('Selecione datas válidas para calcular média.', 'error');
    return;
  }

  const start = new Date(sd);
  const end = new Date(ed);
  let tot = 0, c = 0;

  Object.values(dataStore[currentTab].registros).forEach(mes => {
    Object.keys(mes).forEach(d => {
      mes[d].forEach(r => {
        if (r.tipo === 'retirada') {
          const [dd, mm, yy] = r.data.split('/');
          const dt = new Date(`${yy}-${mm}-${dd}`);
          if (dt >= start && dt <= end) {
            tot += r.placas;
            c++;
          }
        }
      });
    });
  });

  document.getElementById('avgResult').textContent =
    `Média retiradas: ${c ? (tot / c).toFixed(2) : 0} placas`;
}

// Calcula duração do estoque com base na média diária de retiradas
function calcularDuracaoEstoque() {
  let totalRetiradas = 0;
  let diasComRetirada = new Set();

  Object.values(dataStore[currentTab].registros).forEach(mes => {
    Object.keys(mes).forEach(dia => {
      mes[dia].forEach(r => {
        if (r.tipo === 'retirada') {
          totalRetiradas += r.placas;
          diasComRetirada.add(r.data);
        }
      });
    });
  });

  const saldo = dataStore[currentTab].saldo;

  if (diasComRetirada.size === 0) {
    document.getElementById('duracaoResult').textContent = `Não há registros de retirada.`;
    return;
  }

  const mediaDiaria = totalRetiradas / diasComRetirada.size;
  const duracaoDias = mediaDiaria > 0 ? Math.floor(saldo / mediaDiaria) : 'Infinita';

  document.getElementById('duracaoResult').textContent =
    `Média diária: ${mediaDiaria.toFixed(2)} placas — Estoque dura aproximadamente ${duracaoDias} dia(s).`;
}

// Gera PDF com relatório de retiradas do mês selecionado
function gerarPDF() {
  const sel = document.getElementById('monthFilter').value;
  if (sel === 'all') {
    showNotification('Selecione um mês válido para gerar PDF.', 'error');
    return;
  }

  const regs = dataStore[currentTab].registros;
  if (!regs[sel] || Object.keys(regs[sel]).length === 0) {
    showNotification('Nenhuma retirada registrada neste mês.', 'info');
    return;
  }

  const [ano, mes] = sel.split('-');
  const nomeMes = monthNames[parseInt(mes) - 1];
  const material = materials.find(m => m.id === currentTab).nome;

  let dados = [], total = 0;
  Object.keys(regs[sel]).sort().forEach(dia => {
    regs[sel][dia].forEach(r => {
      if (r.tipo === 'retirada') {
        dados.push([`${dia}/${mes}/${ano}`, `${r.placas}`, r.lote || '-']);
        total += r.placas;
      }
    });
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Desenha um retângulo de fundo suave para “emoldurar” o PDF
  doc.setFillColor(224, 224, 224);
  doc.roundedRect(10, 10, 190, 277, 5, 5, 'F');

  doc.setFontSize(18);
  doc.setTextColor(187, 134, 252);
  doc.text(`Relatório de Retiradas - ${material}`, 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`${nomeMes}/${ano}`, 14, 28);

  doc.autoTable({
    startY: 35,
    head: [['Data', 'Quantidade', 'Lote']],
    body: dados,
    theme: 'striped',
    headStyles: { fillColor: [187, 134, 252], textColor: 18 },
    styles: { halign: 'center' },
    alternateRowStyles: { fillColor: [240, 240, 240] }
  });

  const afterY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total de placas retiradas: ${total}`, 14, afterY);
  doc.text(`Saldo atual em estoque: ${dataStore[currentTab].saldo}`, 14, afterY + 7);

  doc.save(`${material}-${nomeMes}-${ano}.pdf`);
}

// ==================== 8. Funções auxiliares ====================

// Salva toda a estrutura dataStore no localStorage
function save() {
  localStorage.setItem('estoque', JSON.stringify(dataStore));
}

// Adiciona novo registro de entrada ou retirada e atualiza passo a passo
function addRecord(tipo, placas, lote) {
  if (!placas || placas <= 0) {
    showNotification('Número inválido para adicionar.', 'error');
    return;
  }
  const h = new Date();
  const m = `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`;
  const d = String(h.getDate()).padStart(2,'0');
  if (!dataStore[currentTab].registros[m]) {
    dataStore[currentTab].registros[m] = {};
  }
  if (!dataStore[currentTab].registros[m][d]) {
    dataStore[currentTab].registros[m][d] = [];
  }
  dataStore[currentTab].registros[m][d].push({
    tipo,
    placas,
    lote,
    data: `${d}/${String(h.getMonth()+1).padStart(2,'0')}/${h.getFullYear()}`
  });
  recalc();
  save();
  renderContent();
  showNotification('Operação concluída com sucesso.', 'success');
}
