// ================================
// Variables and Configurations
// ================================
let artes = JSON.parse(localStorage.getItem('artes')) || [];
let registros = JSON.parse(localStorage.getItem('registros')) || [];
let selectedOperador = '';
const itemsPerPage = 10;
const currentPage = { briefing: 1, criacao: 1, aprovacao: 1, produzido: 1 };

// ================================
// Save and Refresh UI
// ================================
function salvar() {
  localStorage.setItem('artes', JSON.stringify(artes));
  localStorage.setItem('registros', JSON.stringify(registros));
  atualizar();
}

// ================================
// Tab Navigation
// ================================
function mostrar(id) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  atualizar();
}

// ================================
// CRUD Operations
// ================================
function adicionar() {
  const descricao = document.getElementById('descricao').value.trim();
  const operador = document.getElementById('operador').value.trim();
  const cliente = document.getElementById('cliente').value.trim();
  if (!descricao || !operador || !cliente) return alert('Preencha tudo!');
  const hoje = new Date().toLocaleDateString('pt-BR');
  artes.push({
    descricao,
    operador,
    cliente,
    etapa: 'briefing',
    dataBriefing: hoje,
    dataCriacao: '',
    dataAprovacao: '',
    dataProduzido: '',
    dataAlteracao: ''
  });
  salvarHistorico('operador', 'historico_operador');
  salvarHistorico('cliente', 'historico_cliente');
  ['descricao','operador','cliente'].forEach(id => document.getElementById(id).value = '');
  salvar();
}

function excluir(i) {
  if (confirm('Tem certeza que quer excluir?')) {
    artes.splice(i, 1);
    salvar();
  }
}

function editar(i, campo) {
  const novo = prompt(`Editar ${campo}:`, artes[i][campo]);
  if (novo !== null) {
    artes[i][campo] = novo.trim();
    salvar();
  }
}

// ================================
// Step Navigation
// ================================
function moveEtapa(i, dir) {
  const etapas = ['briefing','criacao','aprovacao','produzido'];
  let novoIdx = etapas.indexOf(artes[i].etapa) + dir;
  if (novoIdx < 0 || novoIdx >= etapas.length) return;
  const hoje = new Date().toLocaleDateString('pt-BR');
  artes[i].etapa = etapas[novoIdx];
  if (etapas[novoIdx] === 'criacao') artes[i].dataCriacao = dir === 1 ? hoje : '';
  if (etapas[novoIdx] === 'aprovacao') artes[i].dataAprovacao = dir === 1 ? hoje : '';
  if (etapas[novoIdx] === 'produzido') {
    artes[i].dataProduzido = hoje;
    registros.push(JSON.parse(JSON.stringify(artes[i])));
  }
  if (dir === -1 && etapas[novoIdx] === 'criacao') {
    artes[i].dataAlteracao = hoje;
    artes[i].dataProduzido = '';
  }
  salvar();
}

function proximaEtapa(i) { moveEtapa(i, 1); }

// Volta de Produzido direto pra Criação + marca dataAlteracao
function anteriorEtapa(index) {
  // Se estiver em Produzido, volta direto pra Criação e marca alteração
  if (artes[index].etapa === 'produzido') {
    const hoje = new Date().toLocaleDateString('pt-BR');
    artes[index].dataAlteracao = hoje;
    artes[index].etapa = 'criacao';
    artes[index].dataProduzido = '';  // limpa data de saída
    salvar();
    return;
  }
  // Para as outras etapas, segue a ordem normal de reversão
  const etapas = ['briefing','criacao','aprovacao','produzido'];
  let atual = etapas.indexOf(artes[index].etapa);
  if (atual > 0) {
    // limpa data da etapa atual, se necessário
    if (artes[index].etapa === 'criacao')   artes[index].dataCriacao = '';
    if (artes[index].etapa === 'aprovacao') artes[index].dataAprovacao = '';
    // volta uma etapa
    artes[index].etapa = etapas[atual - 1];
    salvar();
  }
}

// ================================
// Backup and Restore
// ================================
function backup() {
  const blob = new Blob([JSON.stringify({ artes, registros })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup.json';
  a.click();
}

function restaurar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const data = JSON.parse(ev.target.result);
    artes = data.artes || [];
    registros = data.registros || [];
    salvar();
  };
  reader.readAsText(file);
}

// ================================
// PDF Generation
// ================================
function gerarPDF() {
  const op = document.getElementById('filtroOperadorPDF').value;
  if (!op) return alert('Selecione um operador!');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const itens = artes.filter(a => a.operador === op && a.etapa === 'produzido');
  const perPage = 5;
  const lineHeight = 10;
  let y = 30;

  function header() {
    doc.setFillColor(0,255,255);
    doc.rect(0,0,210,10,'F');
    doc.setFont('helvetica','bold').setFontSize(16).setTextColor(0).text('Relatório de Artes',10,8);
    doc.setFontSize(12).text(`Operador: ${op}`,10,18);
    doc.setFontSize(10).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,160,18);
    y = 30;
  }

  header();
  itens.forEach((a, idx) => {
    if (idx > 0 && idx % perPage === 0) { doc.addPage(); header(); }
    doc.rect(10,y,190,lineHeight*4);
    doc.setFont('helvetica','bold').text(`Produto: ${a.descricao}`,12,y+lineHeight);
    doc.setFont('helvetica','normal').text(`Cliente: ${a.cliente}`,12,y+lineHeight*2);
    doc.text(`Entrada: ${a.dataBriefing}`,12,y+lineHeight*3);
    doc.text(`Saída: ${a.dataProduzido}`,100,y+lineHeight*3);
    if (a.dataAlteracao) doc.text(`Alteração: ${a.dataAlteracao}`,12,y+lineHeight*4);
    y += lineHeight*5;
  });
  doc.save(`Relatorio_${op}.pdf`);
}

// ================================
// Autocomplete History
// ================================
function salvarHistorico(id, key) {
  const val = document.getElementById(id).value.trim();
  if (!val) return;
  let list = JSON.parse(localStorage.getItem(key)) || [];
  if (!list.includes(val)) { list.push(val); localStorage.setItem(key, JSON.stringify(list)); }
}

function carregarSugestoes(id, key) {
  const list = JSON.parse(localStorage.getItem(key)) || [];
  const dt = document.getElementById(id);
  dt.innerHTML = '';
  list.forEach(v => {
    const o = document.createElement('option'); o.value = v;
    dt.appendChild(o);
  });
}

['operador','cliente'].forEach(id => {
  carregarSugestoes(id, `historico_${id}`);
  document.getElementById(id).addEventListener('change', () => carregarSugestoes(id, `historico_${id}`));
});

// ================================
// Helpers: Timeline and Item
// ================================
function timelineHTML(a) {
  const etapas = [
    { key:'dataBriefing', label:'Briefing' },
    { key:'dataCriacao',  label:'Criação' },
    { key:'dataAlteracao',label:'Alteração' },
    { key:'dataAprovacao',label:'Aprovação' },
    { key:'dataProduzido',label:'Produzido' }
  ];
  return `<div class="timeline">${etapas.map(e =>
    `<div class="timeline-item"><span>${e.label}${a[e.key] ? `<br><small>${a[e.key]}</small>` : ''}</span></div>`
  ).join('')}</div>`;
}

function itemHTML(a) {
  const idx = artes.indexOf(a);
  return `<div class="item neumo">
    <div onclick="editar(${idx},'descricao')" class="editavel"><strong>Produto:</strong> ${a.descricao}</div>
    <div onclick="editar(${idx},'cliente')" class="editavel"><strong>Cliente:</strong> ${a.cliente}</div>
    <div onclick="editar(${idx},'operador')" class="editavel"><strong>Operador:</strong> ${a.operador}</div>
    <div class="botoes">
      <button onclick="anteriorEtapa(${idx})">← Anterior</button>
      <button onclick="proximaEtapa(${idx})">Próxima →</button>
      <button onclick="excluir(${idx})" style="background:#f33;color:#fff;">Excluir</button>
    </div>
    ${timelineHTML(a)}
  </div>`;
}

// ================================
// Update Sections and Records
// ================================
function atualizar() {
  const secs = ['briefing','criacao','aprovacao','produzido','registros'];
  const ops = Array.from(new Set(artes.map(a => a.operador)));

  // Global Filter and Header
  const fg = document.getElementById('filtroOperadorGlobal');
  fg.innerHTML = `<option value="">Todos</option>` + ops.map(o => `<option>${o}</option>`).join('');
  fg.value = selectedOperador;
  fg.onchange = () => { selectedOperador = fg.value; atualizar(); };

  // PDF Filter
  const fp = document.getElementById('filtroOperadorPDF');
  fp.innerHTML = `<option value="">Selecione...</option>` + ops.map(o => `<option>${o}</option>`).join('');

  // Header Title
  document.getElementById('mainHeader').textContent = `Gerenciador de Artes Supremo${selectedOperador ? ' - ' + selectedOperador : ''}`;

  // Render each section
  secs.forEach(sec => {
    const cont = document.getElementById('lista' + sec.charAt(0).toUpperCase() + sec.slice(1));

    if (sec === 'registros') {
      // Collapsible months
      const agrupado = {};
      registros.filter(a => !selectedOperador || a.operador === selectedOperador)
        .forEach(a => {
          const [d,m,y] = a.dataBriefing.split('/');
          const mk = `${y}-${m}`;
          agrupado[mk] = agrupado[mk] || {};
          agrupado[mk][d] = agrupado[mk][d] || [];
          agrupado[mk][d].push(a);
        });

      cont.innerHTML = Object.entries(agrupado)
        .sort((a,b) => b[0].localeCompare(a[0]))
        .map(([mk, dias]) => {
          const [y,m] = mk.split('-');
          const nomeM = new Date(`${y}-${m}-01`).toLocaleString('pt-BR',{month:'long'});
          return `<div class="month">
            <div class="month-header">📅 ${nomeM.charAt(0).toUpperCase()+nomeM.slice(1)} ${y}</div>
            <div class="month-content">${Object.entries(dias).sort((a,b) => b[0]-a[0])
              .map(([d, itens]) => `<div class="day">
                <h3>${d}/${m}/${y}</h3>
                ${itens.map(it => itemHTML(it)).join('')}
              </div>`).join('')}
            </div>
          </div>`;
        }).join('');

      document.querySelectorAll('.month-header').forEach(h => {
        h.onclick = () => h.parentElement.classList.toggle('expanded');
      });

    } else {
      // Other tabs
      const lista = artes.filter(a => (!selectedOperador||a.operador===selectedOperador) && a.etapa===sec);
      const total = Math.ceil(lista.length/itemsPerPage) || 1;
      if (currentPage[sec] > total) currentPage[sec] = total;
      const start = (currentPage[sec] - 1)*itemsPerPage;
      const slice = lista.slice(start, start+itemsPerPage);

      cont.innerHTML = Object.entries(slice.reduce((acc, a) => {
        (acc[a.operador] = acc[a.operador]||[]).push(a);
        return acc;
      }, {})).map(([op, arr]) => `<div class="item neumo">
        <h3 class="titulo-operador">${sec==='briefing'?'📝':sec==='criacao'?'🎨':sec==='aprovacao'?'✅':'📦'} ${op}</h3>
        ${arr.map(itemHTML).join('')}
      </div>`).join('');

      // Pagination
      const pg = document.getElementById('pagination-'+sec);
      pg.innerHTML = '';
      if (currentPage[sec] > 1) pg.appendChild(novoBtn('←', () => { currentPage[sec]--; atualizar(); }));
      for (let p=1; p<=total; p++) pg.appendChild(novoBtn(p, () => { currentPage[sec]=p; atualizar(); }, p===currentPage[sec]));
      if (currentPage[sec] < total) pg.appendChild(novoBtn('→', () => { currentPage[sec]++; atualizar(); }));
    }
  });

  // Statistics
  const est = document.getElementById('estatisticas');
  if (est) {
    const arr = artes.filter(a => !selectedOperador || a.operador===selectedOperador);
    est.innerHTML = `<p>Total de Artes: ${arr.length}</p>
      <p>Briefing: ${arr.filter(a=>a.etapa==='briefing').length}</p>
      <p>Criação: ${arr.filter(a=>a.etapa==='criacao').length}</p>
      <p>Aprovação: ${arr.filter(a=>a.etapa==='aprovacao').length}</p>
      <p>Produzido: ${arr.filter(a=>a.etapa==='produzido').length}</p>`;
  }
}

// ================================
// Helpers: Buttons, Theme & Sound
// ================================
function novoBtn(txt, fn, act) {
  const b = document.createElement('button');
  b.textContent = txt;
  if (act) b.classList.add('active');
  b.onclick = fn;
  return b;
}

function alternarModo() {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
}
const clickSound = document.getElementById('click-sound');
document.querySelectorAll('nav button.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (clickSound) { clickSound.currentTime = 0; clickSound.play(); }
    document.querySelectorAll('nav button.tab-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// === Autocompletar com histórico para Cliente e Operador ===
const camposComHistorico = [
  { id: 'cliente', storageKey: 'historicoCliente', datalistId: 'cls' },
  { id: 'operador', storageKey: 'historicoOperador', datalistId: 'ops' }
];

camposComHistorico.forEach(({ id, storageKey, datalistId }) => {
  const input = document.getElementById(id);
  const datalist = document.getElementById(datalistId);

  // Carregar histórico salvo
  const historico = JSON.parse(localStorage.getItem(storageKey)) || [];
  historico.forEach(valor => {
    const opt = document.createElement('option');
    opt.value = valor;
    datalist.appendChild(opt);
  });

  // Salvar novo valor ao sair do campo
  input.addEventListener('blur', () => {
    const valor = input.value.trim();
    if (valor && !historico.includes(valor)) {
      historico.push(valor);
      localStorage.setItem(storageKey, JSON.stringify(historico));

      const opt = document.createElement('option');
      opt.value = valor;
      datalist.appendChild(opt);
    }
  });
});


document.addEventListener('DOMContentLoaded', () => {
  atualizar();
  // Load initial suggestions
});
