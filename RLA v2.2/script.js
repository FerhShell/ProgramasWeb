// script.js

// Labels personalizadas para dropdown e timeline
const labels = {
  briefing:   'Entrada',
  criacao:    'Criação',
  analise:    'Análise/Alteração',
  alteracao:  'Alteração Simples',
  aprovacao:  'Conferência',
  produzido:  'Saída',
  pendencia:  'Pêndencia'
};

// Dados e configurações
let artes = JSON.parse(localStorage.getItem('artes')) || [];
let registros = JSON.parse(localStorage.getItem('registros')) || [];
let selectedOperador = '';
let selectedClienteFiltro = '';
let selectedProdutoFiltro = '';
const etapas = Object.keys(labels);
const itemsPerPage = 10;
const currentPage = etapas.reduce((o, e) => { o[e] = 1; return o; }, {});
currentPage.filtro = 1;  // página para a aba Filtro

// Helpers DOM
function doc(id){ return document.getElementById(id).value.trim(); }
function docEl(id){ return document.getElementById(id); }
function novoBtn(txt,fn,act){
  const b = document.createElement('button');
  b.textContent = txt;
  if(act) b.classList.add('active');
  b.onclick = fn;
  return b;
}
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

// Salvar e atualizar UI
function salvar(){
  localStorage.setItem('artes', JSON.stringify(artes));
  localStorage.setItem('registros', JSON.stringify(registros));
  atualizar();
}

// Navegação por abas (neon)
function mostrar(id) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  setTimeout(() => docEl(id).classList.add('active'), 100);
  document.querySelectorAll('nav .tab-button').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === id)
  );
  atualizar();
}

// CRUD
function adicionar(){
  const d = doc('descricao'), o = doc('operador'), c = doc('cliente');
  if(!d||!o||!c) return alert('Preencha tudo!');
  const now = new Date().toLocaleString('pt-BR');
  artes.push({
    descricao: d,
    operador: o,
    cliente: c,
    etapa: 'briefing',
    history: [{etapa:'briefing',time:now}]
  });
  salvarHistorico('operador','historico_operador');
  salvarHistorico('cliente','historico_cliente');
  ['descricao','operador','cliente'].forEach(id=>docEl(id).value='');
  salvar();
  // animação
  if (docEl('briefing').classList.contains('active')) {
    setTimeout(() => {
      const novoItem = document.querySelector('#listaBriefing .item');
      if (novoItem) {
        novoItem.classList.add('animar', 'destacar');
        setTimeout(() => novoItem.classList.remove('destacar'), 2000);
      }
    }, 100);
  }
}
function moverPara(i, nova){
  const now = new Date().toLocaleString('pt-BR');
  artes[i].history.push({etapa:nova,time:now});
  artes[i].etapa = nova;
  if(nova==='produzido') registros.push(JSON.parse(JSON.stringify(artes[i])));
  salvar();
}
function editar(i, campo){
  const novo = prompt(`Editar ${campo}:`, artes[i][campo]);
  if(novo!==null){ artes[i][campo]=novo.trim(); salvar(); }
}
function excluir(i){
  if(confirm('Tem certeza?')){ artes.splice(i,1); salvar(); }
}

// Renderizadores
function timelineHTML(a){
  return `<div class="timeline">${
    a.history.map(h=>`<div class="timeline-item"><span>${labels[h.etapa]}<br><small>${h.time}</small></span></div>`).join('')
  }</div>`;
}
function itemHTML(a, i){
  const options = etapas.map(et=>`<option value="${et}"${et===a.etapa?' selected':''}>${labels[et]}</option>`).join('');
  return `<div class="item neumo">
    <div class="editavel" onclick="editar(${i},'descricao')"><strong>Produto:</strong> ${a.descricao}</div>
    <div class="editavel" onclick="editar(${i},'cliente')"><strong>Cliente:</strong> ${a.cliente}</div>
    <div class="editavel" onclick="editar(${i},'operador')"><strong>Operador:</strong> ${a.operador}</div>
    <div><select onchange="moverPara(${i}, this.value)">${options}</select></div>
    <button onclick="excluir(${i})" style="background:#f33;color:#fff;">Excluir</button>
    ${timelineHTML(a)}
  </div>`;
}

// Carregar filtros de Operador, Cliente e Produto
function carregarFiltros(){
  const ops = [...new Set(artes.map(a=>a.operador))];
  const fg = docEl('filtroOperadorGlobal');
  fg.innerHTML = `<option value="">Todos</option>` + ops.map(o=>`<option>${o}</option>`).join('');
  fg.value = selectedOperador;
  fg.onchange = ()=>{ selectedOperador = fg.value; atualizar(); };

  // Cliente para aba Filtro
  const fc = docEl('filtroCliente');
  if(fc){
    const cls = [...new Set(artes.map(a=>a.cliente))];
    fc.innerHTML = `<option value="">Todos</option>` + cls.map(c=>`<option>${c}</option>`).join('');
    fc.value = selectedClienteFiltro;
    fc.onchange = ()=>{
      selectedClienteFiltro = fc.value;

      // Atualiza o filtro de produtos conforme o cliente selecionado
      const fp2 = docEl('filtroProduto');
      const produtosFiltrados = selectedClienteFiltro
        ? [...new Set(artes.filter(a=>a.cliente === selectedClienteFiltro).map(a=>a.descricao))]
        : [...new Set(artes.map(a=>a.descricao))];
      fp2.innerHTML = `<option value="">Todos</option>` + produtosFiltrados.map(p=>`<option>${p}</option>`).join('');
      selectedProdutoFiltro = ''; // Reseta produto selecionado
      atualizar();
    };
  }

  // Produto para aba Filtro
  const fp2 = docEl('filtroProduto');
  if(fp2){
    const produtosFiltrados = selectedClienteFiltro
      ? [...new Set(artes.filter(a=>a.cliente === selectedClienteFiltro).map(a=>a.descricao))]
      : [...new Set(artes.map(a=>a.descricao))];
    fp2.innerHTML = `<option value="">Todos</option>` + produtosFiltrados.map(p=>`<option>${p}</option>`).join('');
    fp2.value = selectedProdutoFiltro;
    fp2.onchange = ()=>{ selectedProdutoFiltro = fp2.value; atualizar(); };
  }

  // Operador para PDF
  const fp = docEl('filtroOperadorPDF');
  fp.innerHTML = `<option value="">Selecione...</option>` + ops.map(o=>`<option>${o}</option>`).join('');
}


// Atualizar todas as sections
function atualizar(){
  carregarFiltros();
  docEl('mainHeader').textContent = `Gerenciador de Artes Supremo${selectedOperador ? ' - ' + selectedOperador : ''}`;

  // itera tabs (inclui 'filtro')
  [...etapas, 'dashboard', 'registros', 'filtro'].forEach(sec => {

    if (sec === 'dashboard') {
      renderStats(docEl('estatisticas'));
      return;
    }

    if (sec === 'registros') {
      // Mostra registros do mais novo pro mais velho
      renderRegistros(docEl('listaRegistros'));
      return;
    }

    if (sec === 'filtro') {
      // Aba Filtro com ordem invertida
      const el = docEl('listaFiltro');
      const lista = artes
        .filter(a =>
          (!selectedClienteFiltro || a.cliente === selectedClienteFiltro) &&
          (!selectedProdutoFiltro || a.descricao === selectedProdutoFiltro)
        )
        .reverse(); // ← mostra os mais novos primeiro

      const total = Math.ceil(lista.length / itemsPerPage) || 1;
      if (currentPage.filtro > total) currentPage.filtro = total;

      const start = (currentPage.filtro - 1) * itemsPerPage;
      const pageItems = lista.slice(start, start + itemsPerPage);

      el.innerHTML = pageItems.map((a, i) => itemHTML(a, artes.indexOf(a))).join('') || '<p>Sem itens</p>';

      // Paginação
      const pgf = docEl('pagination-filtro');
      pgf.innerHTML = '';
      if (currentPage.filtro > 1) pgf.appendChild(novoBtn('←', () => { currentPage.filtro--; atualizar(); }));
      for (let p = 1; p <= total; p++) {
        pgf.appendChild(novoBtn(p, () => { currentPage.filtro = p; atualizar(); }, p === currentPage.filtro));
      }
      if (currentPage.filtro < total) pgf.appendChild(novoBtn('→', () => { currentPage.filtro++; atualizar(); }));

      return;
    }

    // Abas principais (briefing, criacao, etc.)
    const cont = docEl('lista' + capitalize(sec));

    const lista = artes
      .filter(a =>
        (!selectedOperador || a.operador === selectedOperador) &&
        a.etapa === sec
      )
      .reverse(); // ← ordem invertida aqui também

    const total = Math.ceil(lista.length / itemsPerPage) || 1;
    if (currentPage[sec] > total) currentPage[sec] = total;

    const start = (currentPage[sec] - 1) * itemsPerPage;
    const pageItems = lista.slice(start, start + itemsPerPage);

    // Agrupar por operador
    const grupos = {};
    pageItems.forEach(a => {
      if (!grupos[a.operador]) grupos[a.operador] = [];
      grupos[a.operador].push(a);
    });

    // Renderiza agrupado
    if (pageItems.length === 0) {
      cont.innerHTML = '<p>Sem itens</p>';
    } else {
      cont.innerHTML = Object.entries(grupos).map(([op, itens]) => `
        <div class="operator-container">
          <div class="operator-box">
            <h3>Operador: ${op}</h3>
            ${itens.map(a => itemHTML(a, artes.indexOf(a))).join('')}
          </div>
        </div>
      `).join('');
    }

    // Paginação visual
    const pg = docEl('pagination-' + sec);
    pg.innerHTML = '';
    if (currentPage[sec] > 1) pg.appendChild(novoBtn('←', () => { currentPage[sec]--; atualizar(); }));
    for (let p = 1; p <= total; p++) {
      pg.appendChild(novoBtn(p, () => { currentPage[sec] = p; atualizar(); }, p === currentPage[sec]));
    }
    if (currentPage[sec] < total) pg.appendChild(novoBtn('→', () => { currentPage[sec]++; atualizar(); }));
  });
}


// Estatísticas e registros
function renderStats(el){
  const arr = artes.filter(a=>!selectedOperador||a.operador===selectedOperador);
  el.innerHTML = `<p>Total de Artes: ${arr.length}</p>` +
    etapas.map(e=>`<p>${labels[e]}: ${arr.filter(a=>a.etapa===e).length}</p>`).join('');
}
function renderRegistros(el){
  el.innerHTML = registros.map((a,i)=>itemHTML(a,i)).join('') || '<p>Sem registros</p>';
}

// Gerar PDF (sem alterações)
function gerarPDF() {
  const operador = docEl('filtroOperadorPDF').value;
  if (!operador) return alert("Selecione um operador!");
  const registrosOperador = registros.filter(r => r.operador === operador);
  if (registrosOperador.length === 0) return alert("Sem registros para esse operador!");

  let conteudo = '';
  registrosOperador.forEach((r,index) => {
    const etapasLinha = r.history.map(h=>`
      <th style="padding:5px;border:1px solid #999;text-align:center;color:#000;background:#eee">
        ${labels[h.etapa]}
      </th>`).join('');
    const datasLinha = r.history.map(h=>`
      <td style="padding:5px;border:1px solid #999;text-align:center;color:#000">
        ${h.time}
      </td>`).join('');
    conteudo += `
      <div style="margin-bottom:20px;border-bottom:2px solid #ccc;padding-bottom:10px;color:#000">
        <p><strong>Produto:</strong> ${r.descricao||'Sem descrição'}</p>
        <p><strong>Cliente:</strong> ${r.cliente||'Sem cliente'}</p>
        <div style="overflow-x:auto">
          <table style="border-collapse:collapse;width:100%;font-size:10px">
            <thead><tr style="background:#ddd">${etapasLinha}</tr></thead>
            <tbody><tr>${datasLinha}</tr></tbody>
          </table>
        </div>
      </div>
      ${(index+1)%6===0 && index+1!==registrosOperador.length?'<div style="page-break-after:always"></div>':''}
    `;
  });

  const container = document.createElement('div');
  container.innerHTML = `
    <h1 style="text-align:center;font-size:20px;color:#000">Relatório de Artes</h1>
    <h2 style="text-align:center;font-size:16px;color:#000">Operador: ${operador}</h2>
    <hr style="border:1px solid #ccc"><br>${conteudo}
  `;
  container.style.fontSize='17px'; container.style.color='#000';

  const opt = {
    margin:[5,5,5,5],
    filename:`Relatorio_${operador.replace(/\s+/g,'_')}.pdf`,
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
  };
  html2pdf().set(opt).from(container).save();
}

// Histórico, backup e restaurar
function salvarHistorico(id,key){
  const val = doc(id);
  if(!val) return;
  let arr = JSON.parse(localStorage.getItem(key))||[];
  if(!arr.includes(val)){ arr.push(val); localStorage.setItem(key, JSON.stringify(arr)); }
}
function backup(){
  const blob = new Blob([JSON.stringify({artes,registros})],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup.json';
  a.click();
}
function restaurar(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const data = JSON.parse(ev.target.result);
    artes = data.artes||[];
    registros = data.registros||[];
    salvar();
  };
  reader.readAsText(file);
}

// Tema e som de clique
function alternarModo(){
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
}
const clickSound = docEl('click-sound');
document.querySelectorAll('nav .tab-button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(clickSound){ clickSound.currentTime = 0; clickSound.play(); }
  });
});

// Carrega histórico salvo do localStorage nos datalists
function carregarAutoComplete(){
  const ops = JSON.parse(localStorage.getItem('historico_operador')) || [];
  const cls = JSON.parse(localStorage.getItem('historico_cliente')) || [];
  const prods = [...new Set(artes.map(a => a.descricao))];

  preencherDatalist('historico_operador', ops);
  preencherDatalist('historico_cliente', cls);
  preencherDatalist('historico_descricao', prods);
}

// Preenche um datalist com opções
function preencherDatalist(id, arr){
  const el = docEl(id);
  el.innerHTML = arr.map(v => `<option value="${v}">`).join('');
}

// Monitorar campos e salvar novo valor automaticamente
function configurarAutoSave(){
  const campos = [
    { id: 'operador', key: 'historico_operador' },
    { id: 'cliente', key: 'historico_cliente' },
    { id: 'descricao', key: 'historico_descricao' }
  ];

  campos.forEach(({ id, key }) => {
    const el = docEl(id);
    if (el) {
      el.setAttribute('list', key); // vincula o datalist
      el.addEventListener('change', () => {
        const val = el.value.trim();
        if (!val) return;
        let arr = JSON.parse(localStorage.getItem(key)) || [];
        if (!arr.includes(val)) {
          arr.push(val);
          localStorage.setItem(key, JSON.stringify(arr));
          preencherDatalist(key, arr); // atualiza o datalist na hora
        }
      });
    }
  });
  }

document.addEventListener('DOMContentLoaded', ()=>{
  atualizar();
  carregarAutoComplete(); // carregar histórico salvo
  configurarAutoSave();   // monitorar inputs pra salvar
});
