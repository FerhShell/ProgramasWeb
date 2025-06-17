// ===== Elementos do DOM =====
const entradaEl   = document.getElementById('entrada');
const saidaEl     = document.getElementById('saida');
const calcularBtn = document.getElementById('calcularBtn');
const limparBtn   = document.getElementById('limparBtn');
const tableBody   = document.querySelector('#logTable tbody');
const totalEl     = document.getElementById('totalSaldo');

// ===== Função de padding para duas casas =====
function pad(n) {
  return n.toString().padStart(2, '0');
}

// ===== Calcula saldo entre dois horários =====
function calculaSaldo(hEntrada, hSaida) {
  const [hE, mE] = hEntrada.split(':').map(Number);
  const [hS, mS] = hSaida.split(':').map(Number);
  const minE = hE * 60 + mE;
  const minS = hS * 60 + mS;
  const diff = minS - minE;
  const sinal = diff < 0 ? '-' : '';
  const abs = Math.abs(diff);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  return `${sinal}${pad(hh)}:${pad(mm)}`;
}

// ===== Lê/S grava registros no localStorage =====
function getLogs() {
  return JSON.parse(localStorage.getItem('timeLogs') || '[]');
}
function setLogs(logs) {
  localStorage.setItem('timeLogs', JSON.stringify(logs));
}

// ===== Renderiza a tabela e calcula total =====
function renderTable() {
  const logs = getLogs();
  tableBody.innerHTML = '';
  let totalMin = 0;

  logs.forEach((r, idx) => {
    const { date, start, end, saldo } = r;
    const sign = saldo.startsWith('-') ? -1 : 1;
    const [h, m] = saldo.replace('-', '').split(':').map(Number);
    totalMin += sign * (h * 60 + m);

    const tr = document.createElement('tr');
    // Células contenteditable para data, entrada e saída
    tr.innerHTML = `
      <td contenteditable="true" data-field="date" data-idx="${idx}">${date}</td>
      <td contenteditable="true" data-field="start" data-idx="${idx}">${start}</td>
      <td contenteditable="true" data-field="end" data-idx="${idx}">${end}</td>
      <td>${saldo}</td>
      <td>
        <button class="action-btn edit" data-action="edit" data-idx="${idx}">✎</button>
        <button class="action-btn delete" data-action="delete" data-idx="${idx}">🗑️</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  const sinal = totalMin < 0 ? '-' : '';
  const abs = Math.abs(totalMin);
  const th = Math.floor(abs / 60);
  const tm = abs % 60;
  totalEl.textContent = `${sinal}${pad(th)}:${pad(tm)}`;
  attachCellListeners();
}

// ===== Atualiza logs após edição inline =====
function attachCellListeners() {
  document.querySelectorAll('[contenteditable]').forEach(cell => {
    cell.addEventListener('blur', () => {
      const idx = cell.dataset.idx;
      const field = cell.dataset.field;
      const logs = getLogs();
      logs[idx][field] = cell.textContent.trim();
      // Se alterou entrada ou saída, recalcula saldo
      if (field === 'start' || field === 'end') {
        logs[idx].saldo = calculaSaldo(logs[idx].start, logs[idx].end);
      }
      setLogs(logs);
      renderTable();
    });
  });

  // Ações de editar e deletar (delete confirma)
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.idx;
      const action = btn.dataset.action;
      const logs = getLogs();
      if (action === 'delete') {
        if (confirm('Apagar este registro?')) {
          logs.splice(idx, 1);
          setLogs(logs);
          renderTable();
        }
      }
    });
  });
}

// ===== Registrar novo ponto =====
calcularBtn.addEventListener('click', () => {
  const ent = entradaEl.value;
  const sai = saidaEl.value;
  if (!ent || !sai) {
    alert('Preenche entrada e saída antes, meu amigo!');
    return;
  }
  const hoje = new Date().toLocaleDateString('pt-BR');
  const saldo = calculaSaldo(ent, sai);
  const logs = getLogs();
  logs.push({ date: hoje, start: ent, end: sai, saldo });
  setLogs(logs);
  renderTable();
  entradaEl.value = '';
  saidaEl.value = '';
});

// ===== Limpar tudo =====
limparBtn.addEventListener('click', () => {
  if (confirm('Quer mesmo apagar TODOS os registros?')) {
    localStorage.removeItem('timeLogs');
    renderTable();
  }
});

// ===== Inicia tabela =====
window.addEventListener('load', renderTable);