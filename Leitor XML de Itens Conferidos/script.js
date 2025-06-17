(() => {
  const { jsPDF } = window.jspdf;
  const dropZone = document.getElementById('dropZone');
  const operatorInput = document.getElementById('operatorName');
  const dateFilter = document.getElementById('dateFilter');
  const table = document.getElementById('resultTable');
  const tbody = table.querySelector('tbody');
  const btnPDF = document.getElementById('btnGeneratePDF');

  const OPERATOR_KEY = 'operatorName';
  const ENTRIES_KEY = 'xmlEntries';

  const savedOperator = localStorage.getItem(OPERATOR_KEY);
  if (savedOperator) operatorInput.value = savedOperator;
  operatorInput.addEventListener('change', () => {
    localStorage.setItem(OPERATOR_KEY, operatorInput.value.trim());
  });

  const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');

  function saveEntries() {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  }

  function hoje() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  function parseXML(text) {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const cliente = xml.querySelector('cliente-nome-fantasia')?.textContent.trim() || 'N/D';
    const id   = xml.querySelector('ordem-servico-id')?.textContent.trim()    || '';
    const ver  = xml.querySelector('ordem-servico-versao')?.textContent.trim()|| '';
    const ped  = xml.querySelector('ordem-servico-pedido')?.textContent.trim() || '';
    const os   = `${id}-v${ver}-p${ped}`;
    const coresArr = Array.from(xml.querySelectorAll('colors > color'));
    const qtdCores = coresArr.filter(c =>
      c.querySelector('gravar[type="boolean"]')?.textContent.trim().toLowerCase() === 'true'
    ).length;
    return { data: hoje(), cliente, os, qtdCores };
  }

  function refreshDateFilter() {
    const dates = Array.from(new Set(entries.map(e => e.data)));
    dateFilter.innerHTML = '<option value="Todas">Todas</option>' +
      dates.map(d => `<option value="${d}">${d}</option>`).join('');
  }

  function addRowToDOM({ data, cliente, os, qtdCores }) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${data}</td>
      <td>${cliente}</td>
      <td>${os}</td>
      <td>${qtdCores}</td>
    `;
    tbody.appendChild(tr);
  }

  function renderTable() {
    const sel = dateFilter.value;
    tbody.innerHTML = '';
    entries
      .filter(e => sel === 'Todas' || e.data === sel)
      .forEach(addRowToDOM);
    table.style.display = entries.length ? 'table' : 'none';
    btnPDF.style.display = entries.length ? 'inline-block' : 'none';
  }

  function handleFile(file) {
    if (!file || !file.name.endsWith('.xml')) {
      alert('Use um arquivo XML válido.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const entry = parseXML(reader.result);
      entries.push(entry);
      saveEntries();
      refreshDateFilter();
      renderTable();
    };
    reader.readAsText(file);
  }

 function generatePDF() {
  const operator = operatorInput.value.trim() || 'Operador não informado';
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  // 1) Cabeçalho do documento
  doc.setFontSize(18);
  doc.text('Relatório de Itens Conferidos', margin, y);
  y += 25;

  doc.setFontSize(12);
  doc.text(`Operador: ${operator}`, margin, y);
  y += 15;

  const hoje = new Date();
  const dataStr = `${String(hoje.getDate()).padStart(2,'0')}/` +
                  `${String(hoje.getMonth()+1).padStart(2,'0')}/` +
                  `${hoje.getFullYear()}`;
  doc.text(`Data do Documento: ${dataStr}`, margin, y);
  y += 20;

  // linha divisória
  doc.setLineWidth(0.8);
  doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
  y += 20;

  // 2) Cabeçalho de colunas estilo Excel
  const headers   = ['Data', 'Cliente', 'OS', 'Cores'];
  const colWidths = [ 80,      200,      200,     60   ];
  const rowHeight = 20;  // CORRIGIDO: número, não variável
  let x = margin;

  // configurações de estilo do header
  doc.setDrawColor(0, 0, 0);       // borda preta
  doc.setFillColor(80, 80, 80);    // fundo cinza escuro (#505050)
  doc.setTextColor(255, 255, 255); // texto branco
  doc.setFontSize(11);

  headers.forEach((txt, i) => {
    // 'DF' = Draw stroke + Fill
    doc.rect(x, y, colWidths[i], rowHeight, 'DF');
    // posiciona o texto dentro da célula
    doc.text(txt, x + 4, y + rowHeight - 6);
    x += colWidths[i];
  });
  y += rowHeight;

  // 3) Linhas de dados com grade
  doc.setTextColor(0, 0, 0); // volta a texto preto
  entries.forEach(e => {
    x = margin;
    [e.data, e.cliente, e.os, String(e.qtdCores)].forEach((val, i) => {
      doc.rect(x, y, colWidths[i], rowHeight); // grade
      doc.text(val, x + 4, y + rowHeight - 6);
      x += colWidths[i];
    });
    y += rowHeight;
    // quebra de página se ultrapassar a margem
    if (y + rowHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  });

  doc.save('relatorio_itens_conferidos.pdf');
}



  ['dragover','dragenter'].forEach(ev =>
    dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('dragover'); })
  );
  ['dragleave','dragend','drop'].forEach(ev =>
    dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('dragover'); })
  );
  dropZone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
  dropZone.addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xml';
    inp.onchange = ev => handleFile(ev.target.files[0]);
    inp.click();
  });

  dateFilter.addEventListener('change', renderTable);
  btnPDF.addEventListener('click', generatePDF);

  if (entries.length) {
    refreshDateFilter();
    renderTable();
  }
})();
