// Quando o DOM estiver carregado, executa essa função
document.addEventListener('DOMContentLoaded', () => {

  // Pega o construtor jsPDF da biblioteca que foi carregada no HTML
  const { jsPDF } = window.jspdf;

  // Seleciona elementos do DOM e armazena em variáveis
  const form = document.getElementById('errorForm');                 // Formulário de registro de erro
  const report = document.getElementById('report');                  // Seção onde fica o relatório completo
  const operatorList = document.getElementById('operatorList');      // Div que vai mostrar a lista de operadores
  const operatorButton = document.getElementById('operatorButton');  // Botão para abrir/fechar lista de operadores
  const xmlDropZone = document.getElementById('xmlDropZone');        // Área para arrastar o arquivo XML

  const addOperatorBtn = document.getElementById('addOperator');     // Botão "Adicionar Operador"
  const removeOperatorBtn = document.getElementById('removeOperator'); // Botão "Remover Operador"
  const exportBackupBtn = document.getElementById('exportBackup');   // Botão "Exportar Backup"
  const importBackupBtn = document.getElementById('importBackup');   // Botão "Importar Backup"
  const importFileInput = document.getElementById('importFile');     // Input oculto para selecionar arquivo JSON ao importar
  const clearAllBtn = document.getElementById('clearAll');           // Botão "Limpar Tudo"
  const generatePDFBtn = document.getElementById('generatePDF');     // Botão "Gerar PDF"
  const toggleErrosBtn = document.getElementById('toggleErrosBtn');  // Botão para mostrar/ocultar relatório de erros

  const errosDropdown = document.getElementById('errosDropdown');    // Div que conterá dropdown detalhado de erros
  const chartCtx = document.getElementById('errorChart').getContext('2d'); // Contexto 2D para o gráfico

  // Carrega dados do localStorage ou inicializa arrays vazios
  let errors = JSON.parse(localStorage.getItem('errors') || '[]');      // Array de erros registrados
  let operators = JSON.parse(localStorage.getItem('operators') || '[]'); // Array de operadores cadastrados
  let selectedOperator = null;                                          // Operador atualmente selecionado
  let errorChart = null;                                                // Instância do gráfico

  // Função que salva arrays de erros e operadores no localStorage
  const saveStorage = () => {
    localStorage.setItem('errors', JSON.stringify(errors));            // Converte 'errors' para string JSON e salva
    localStorage.setItem('operators', JSON.stringify(operators));      // Converte 'operators' para string JSON e salva
  };

  // Função que renderiza (mostra) lista de operadores no dropdown
  const renderOperators = () => {
    // Ordena alfabeticamente, considerando português
    operators.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    // Monta o HTML dos inputs de rádio para cada operador
    operatorList.innerHTML = operators.map(op =>
      `<label>
         <input type="radio" name="operator" value="${op}" ${selectedOperator === op ? 'checked' : ''}>
         ${op}
       </label>`
    ).join('');
    // Para cada input de rádio recém-criado, define evento de mudança
    document.querySelectorAll('input[name="operator"]').forEach(i => {
      i.onchange = () => {
        selectedOperator = i.value;                            // Define o operador selecionado
        operatorList.style.display = 'none';                   // Esconde a lista após selecionar
        operatorButton.textContent = `Operador: ${selectedOperator}`; // Atualiza texto do botão
      };
    });
  };

  // Função que preenche campos do formulário a partir de dados extraídos do XML
  const fillFields = ({ cliente, operador, osId, versao, pedido }) => {
    if (cliente) document.getElementById('client').value = cliente;        // Preenche campo "Cliente"
    if (operador) {
      // Se operador não estiver cadastrado, adiciona ao array e salva
      if (!operators.includes(operador)) {
        operators.push(operador);
        saveStorage();
      }
      selectedOperator = operador;                                         // Define operador selecionado
      operatorButton.textContent = `Operador: ${operador}`;                // Atualiza botão
      renderOperators();                                                    // Re-renderiza lista de operadores
    }
    // Se os três campos existirem, formata e preenche o campo "Número da OS"
    if (osId && versao && pedido) {
      document.getElementById('orderNumber').value = `${osId}-v${versao}-p${pedido}`;
    }
  };

  // Função que faz parsing (converte texto em DOM) e extrai informações do XML
  const parseAndFill = xmlString => {
    const parser = new DOMParser();                                      // Cria parser XML
    const xml = parser.parseFromString(xmlString, 'application/xml');   // Converte string em objeto XML

    let cliente = '';
    const clienteTags = xml.getElementsByTagName('cliente-nome-fantasia'); // Busca tags <cliente-nome-fantasia>
    if (clienteTags.length > 0) cliente = clienteTags[0].textContent.trim(); // Se achou, pega o texto

    let operador = '';
    const opTags = xml.getElementsByTagName('operador-id');              // Busca tags <operador-id>
    if (opTags.length > 0) operador = opTags[0].textContent.trim();      // Se achou, pega o texto

    let osId = '', versao = '', pedido = '';
    const osTags = xml.getElementsByTagName('ordem-servico-id');         // Busca <ordem-servico-id>
    if (osTags.length > 0) osId = osTags[0].textContent.trim();
    const versaoTags = xml.getElementsByTagName('ordem-servico-versao'); // Busca <ordem-servico-versao>
    if (versaoTags.length > 0) versao = versaoTags[0].textContent.trim();
    const pedidoTags = xml.getElementsByTagName('ordem-servico-pedido'); // Busca <ordem-servico-pedido>
    if (pedidoTags.length > 0) pedido = pedidoTags[0].textContent.trim();

    fillFields({ cliente, operador, osId, versao, pedido });             // Passa dados para preencher campos
  };

  // Configura eventos de Drag & Drop para a zona de XML
  xmlDropZone.addEventListener('dragover', e => {
    e.preventDefault();               // Evita comportamento padrão
    xmlDropZone.classList.add('dragover'); // Adiciona classe para estilo visual
  });
  xmlDropZone.addEventListener('dragleave', () => {
    xmlDropZone.classList.remove('dragover'); // Remove classe quando sai da área
  });
  xmlDropZone.addEventListener('drop', e => {
    e.preventDefault();               // Evita redirecionar o arquivo
    xmlDropZone.classList.remove('dragover'); // Remove efeito visual
    const file = e.dataTransfer.files[0];      // Pega o arquivo solto
    if (!file) return;                          // Se não tiver arquivo, sai
    if (!file.name.match(/\.xml$/i)) {          // Verifica extensão .xml (case-insensitive)
      alert('Envie um arquivo XML válido.');    // Alerta o usuário
      return;
    }
    const reader = new FileReader();            // Cria leitor de arquivo
    reader.onload = ev => {
      try {
        parseAndFill(ev.target.result);         // Quando carregar, parseia XML
      } catch (err) {
        console.error('Erro ao parsear XML:', err);
        alert('Não foi possível ler o XML.');   // Alerta se der erro no parse
      }
    };
    reader.readAsText(file, 'UTF-8');           // Lê arquivo como texto UTF-8
  });

  // Quando clica no botão de selecionar operador, abre ou fecha a lista
  operatorButton.addEventListener('click', () => {
    operatorList.style.display = operatorList.style.display === 'block' ? 'none' : 'block';
  });

  // Ao clicar em "Adicionar Operador", pede nome e adiciona se não existir
  addOperatorBtn.addEventListener('click', () => {
    const newOp = prompt('Digite o nome do novo operador:'); // Pergunta nome
    if (newOp && !operators.includes(newOp)) {               // Se digitou e não existe
      operators.push(newOp);                                  // Adiciona ao array
      saveStorage();                                          // Salva no localStorage
      renderOperators();                                      // Atualiza lista
    }
  });

  // Ao clicar em "Remover Operador", remove o que estiver selecionado
  removeOperatorBtn.addEventListener('click', () => {
    if (!selectedOperator) {
      alert('Selecione um operador para remover.');           // Precisa ter um selecionado
      return;
    }
    if (confirm(`Deseja remover o operador "${selectedOperator}"?`)) {
      operators = operators.filter(o => o !== selectedOperator); // Filtra o array para remover
      selectedOperator = null;                                    // Zera seleção
      saveStorage();                                              // Salva alterações
      renderOperators();                                          // Atualiza lista
      operatorButton.textContent = 'Selecione um Operador';      // Reseta texto do botão
    }
  });

  // Botão "Exportar Backup" — gera um arquivo JSON com erros e operadores
  exportBackupBtn.addEventListener('click', () => {
    const data = { errors, operators };                         // Cria objeto com dados
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);                       // Cria URL temporária
    const a = document.createElement('a');                       // Cria link invisível
    a.href = url;
    a.download = 'backup_erros.json';                            // Define nome do arquivo
    a.click();                                                    // Simula clique para download
    URL.revokeObjectURL(url);                                     // Limpa URL temporária
  });

  // Botão "Importar Backup" — abre o file input para selecionar JSON
  importBackupBtn.addEventListener('click', () => {
    importFileInput.click();                                      // Dispara clique no input oculto
  });
  importFileInput.addEventListener('change', e => {
    const file = e.target.files[0];                               // Pega arquivo selecionado
    if (!file) return;                                            // Se não tiver, sai
    const reader = new FileReader();                              // Cria leitor de arquivo
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);                // Converte string em JSON
        errors = data.errors || [];                               // Atualiza array de erros
        operators = data.operators || [];                         // Atualiza array de operadores
        saveStorage();                                            // Salva no localStorage
        renderOperators();                                        // Atualiza lista de operadores
        alert('Backup importado com sucesso!');                    // Avisa sucesso
        generateDropdown();   // atualiza o dropdown detalhado         // Atualiza lista de erros detalhada
        generateChart();      // atualiza o gráfico                    // Atualiza gráfico
      } catch (err) {
        console.error('Erro ao ler backup JSON:', err);
        alert('Arquivo JSON inválido.');                            // Alerta se JSON for inválido
      }
    };
    reader.readAsText(file, 'UTF-8');                             // Lê arquivo como texto UTF-8
  });

  // Botão "Limpar Tudo" — zera arrays de erros e operadores e limpa interface
  clearAllBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja limpar todos os registros e operadores?')) {
      errors = [];            // Zera array de erros
      operators = [];         // Zera array de operadores
      saveStorage();          // Salva mudanças (arrays vazios)
      renderOperators();      // Atualiza lista (vai ficar vazia)
      generateDropdown();     // Atualiza dropdown (vai ficar vazio)
      generateChart();        // Atualiza gráfico (sem dados)
    }
  });

  // Função que gera PDF agrupado por operador, 10 itens por página
  generatePDFBtn.addEventListener('click', () => {
    if (errors.length === 0) {                                  // Se não houver erros
      alert('Não há erros registrados para gerar PDF.');
      return;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });        // Cria instância do jsPDF
    const margin = 40;                                          // Margem lateral
    const lineHeight = 14;                                      // Altura de linha para texto
    const pageWidth = doc.internal.pageSize.getWidth();         // Largura da página
    const pageHeight = doc.internal.pageSize.getHeight();       // Altura da página
    const itemsPerPage = 10;                                    // Máximo de itens por página

    const grouped = groupByOperator();                          // Agrupa erros por operador
    const operadores = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'pt-BR')); // Lista de nomes de operadores ordenada

    operadores.forEach((op, idxOp) => {                         // Para cada operador
      if (idxOp > 0) doc.addPage();                             // Se não for o primeiro, cria nova página

      // Cabeçalho estilizado com cor de fundo
      const headerHeight = 50;                                   // Altura do cabeçalho
      doc.setFillColor(0, 188, 212);                             // Define cor de preenchimento (azul claro)
      doc.rect(0, 0, pageWidth, headerHeight, 'F');              // Desenha retângulo no topo
      doc.setTextColor(255, 255, 255);                           // Cor do texto branco
      doc.setFontSize(18);                                       // Tamanho da fonte
      doc.text(`Relatório de Erros - ${op}`, margin, 32);        // Escreve título com nome do operador

      // Define posição inicial do cursor abaixo do cabeçalho
      let cursorY = headerHeight + 20;
      doc.setTextColor(0, 0, 0);                                 // Texto preto para o conteúdo
      doc.setFontSize(12);                                       // Fonte um pouco menor

      const arr = grouped[op];                                   // Array de erros do operador atual
      arr.forEach(({ data: e }, indexErr) => {                   // Para cada erro registrado
        // Se chegar em múltiplo de itemsPerPage, cria nova página e redesenha cabeçalho
        if (indexErr > 0 && indexErr % itemsPerPage === 0) {
          doc.addPage();                                         // Nova página
          doc.setFillColor(0, 188, 212);
          doc.rect(0, 0, pageWidth, headerHeight, 'F');          // Redesenha cabeçalho
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(18);
          doc.text(`Relatório de Erros - ${op}`, margin, 32);
          cursorY = headerHeight + 20;                           // Reset cursorY
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(12);
        }

        // Cria array de linhas de texto que serão escritas no PDF
        const texto = [
          `Data: ${e.date}`,                                      // Linha com data
          `Cliente: ${e.client}`,                                 // Linha com nome do cliente
          `OS: ${e.orderNumber}`,                                 // Linha com número da OS
          `Descrição: ${e.description}`                           // Linha com descrição do erro
        ];
        texto.forEach(linha => {                                  // Para cada linha do texto
          doc.text(linha, margin, cursorY);                       // Escreve texto na posição atual
          cursorY += lineHeight;                                  // Move cursor para a próxima linha
        });

        // Desenha linha separadora após cada registro
        doc.setDrawColor(150);                                    // Cor da linha cinza
        doc.setLineWidth(0.5);                                    // Espessura fina
        doc.line(margin, cursorY, pageWidth - margin, cursorY);   // Desenha linha horizontal
        cursorY += lineHeight;                                    // Espaço após a linha
      });
    });

    doc.save('Relatorios_Erros_Por_Operador.pdf');                // Salva o PDF com nome definido
  });

  // Botão “Ver Relatórios de Erros” — alterna visibilidade do dropdown de erros
  toggleErrosBtn.addEventListener('click', () => {
    errosDropdown.classList.toggle('open');                       // Adiciona/remove classe para abrir
    toggleErrosBtn.classList.toggle('open');                      // Ajusta seta do botão
    toggleErrosBtn.textContent = errosDropdown.classList.contains('open')
      ? 'Ocultar Relatórios de Erros'                             // Se abriu, muda texto para "Ocultar"
      : 'Ver Relatórios de Erros';                                // Se fechou, volta para "Ver"
  });

  // Função que agrupa erros por operador e retorna objeto { operador: [lista de erros] }
  const groupByOperator = () => {
    return errors.reduce((acc, e, idx) => {                        // Percorre todos os erros
      (acc[e.operator] = acc[e.operator] || []).push({ data: e, index: idx }); // Adiciona erro no array do operador
      return acc;                                                  // Retorna acumulador
    }, {});
  };

  // Função que gera dropdown detalhado de erros (lista acima do gráfico)
  const generateDropdown = () => {
    errosDropdown.innerHTML = '';                                   // Limpa conteúdo existente
    const grouped = groupByOperator();                              // Agrupa erros por operador

    Object.entries(grouped).forEach(([op, arr]) => {                // Para cada operador e seu array
      const opContainer = document.createElement('div');            // Cria div container para esse operador
      opContainer.className = 'operador-erros';                     // Classe para estilo

      const header = document.createElement('h3');                  // Cria cabeçalho <h3>
      header.textContent = `${op} (${arr.length} erro${arr.length > 1 ? 's' : ''})`; // Exibe nome e quantidade
      opContainer.appendChild(header);                               // Adiciona ao container

      const listDiv = document.createElement('div');                // Cria div que conterá lista de erros
      listDiv.className = 'erros-lista';                             // Classe para estilo e transição

      const ul = document.createElement('ul');                       // Cria lista não ordenada <ul>
      arr.forEach(({ data: e, index }) => {                          // Para cada erro do operador
        const li = document.createElement('li');                     // Cria item de lista <li> Monta conteúdo do erro + botão remover
        li.innerHTML = `                                             
          <div>
            <strong>Data:</strong> ${e.date}<br>
            <strong>Cliente:</strong> ${e.client}<br>
            <strong>OS:</strong> ${e.orderNumber}<br>
            ${e.description}
          </div>
          <button data-index="${index}">
            <!-- Ícone de lixeira -->
            <svg class="icon icon-trash" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 6h18M8 6v14m8-14v14M5 6l1-2h12l1 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Remover
          </button>
        `;
        // Ao clicar no botão "Remover", exclui o erro do array e atualiza a exibição
        li.querySelector('button').addEventListener('click', () => {
          errors.splice(index, 1);           // Remove o erro pelo índice
          saveStorage();                     // Salva localStorage atualizado
          generateDropdown();               // Atualiza dropdown (sem o erro removido)
          generateChart();                  // Atualiza gráfico (quantidade ajustada)
        });
        ul.appendChild(li);                  // Adiciona item <li> na lista <ul>
      });
      listDiv.appendChild(ul);               // Insere <ul> dentro da div de lista
      opContainer.appendChild(listDiv);      // Insere div de lista dentro do container

      // Quando clica no header, alterna abrir/fechar a lista específica
      header.addEventListener('click', () => {
        header.classList.toggle('open');     // Alterna seta do header
        listDiv.classList.toggle('open');    // Alterna visibilidade da lista
      });

      errosDropdown.appendChild(opContainer); // Adiciona o bloco inteiro ao dropdown principal
    });
  };

  // Função que gera apenas o gráfico de barras, sem dropdown de erros
  const generateChart = () => {
    report.style.display = 'block';         // Garante que a seção do relatório esteja visível
    if (errorChart) errorChart.destroy();   // Se já existe gráfico, destrói para recriar

    const grouped = groupByOperator();       // Agrupa erros por operador
    const labels = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'pt-BR')); // Nomes dos operadores
    const data = labels.map(l => grouped[l].length); // Quantidade de erros por operador

    // Cria gráfico de barras horizontal usando Chart.js
    errorChart = new Chart(chartCtx, {
      type: 'bar',                           // Gráfico de barras
      data: {
        labels,                              // Eixo Y recebe nomes (labels)
        datasets: [{
          label: 'Erros',                    // Legenda do dataset
          data,                              // Valores de cada operador
          backgroundColor: labels.map((_, i) => { // Cores do background para cada barra
            const palette = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6'];
            return palette[i % palette.length]; // Usa paleta em loop
          }),
          borderColor: '#333',               // Cor da borda das barras
          borderWidth: 1,                    // Largura da borda
          barThickness: 30                   // Espessura fixa das barras
        }]
      },
      options: {
        indexAxis: 'y',                     // Gráfico horizontal (Eixo Y indexado)
        responsive: true,                   // Responsivo
        maintainAspectRatio: false,         // Não mantém razão de aspecto fixa
        scales: {
          x: {
            beginAtZero: true,              // Inicia X em zero
            ticks: { color: '#f5f5f5', font: { size: 14 }, stepSize: 1 }, // Estilo dos ticks (eixo X)
            grid: { color: '#444' }         // Cor da grid no eixo X
          },
          y: {
            ticks: { color: '#f5f5f5', font: { size: 14 } }, // Estilo dos ticks (eixo Y)
            grid: { display: false }        // Remove linhas verticais de grid
          }
        },
        plugins: {
          legend: { display: false },       // Não exibe legenda
          datalabels: {                     // Plugin datalabels para mostrar valor nas barras
            color: '#f5f5f5',
            anchor: 'end',
            align: 'right',
            font: { size: 14, weight: 'bold' },
            formatter: value => value       // Exibe o próprio valor
          },
          tooltip: {
            enabled: true,                  // Ativa tooltip
            callbacks: {
              label: ctx => `Erros: ${ctx.parsed.x}` // Formato do texto do tooltip
            }
          }
        }
      },
      plugins: [ChartDataLabels]             // Ativa plugin ChartDataLabels
    });
  };

  // Evento de submissão do formulário de novo erro
  form.addEventListener('submit', e => {
    e.preventDefault();                     // Evita recarregar a página

    if (!selectedOperator) {                // Se não tiver operador selecionado
      alert('Selecione um operador antes de registrar o erro!');
      return;
    }
    const client = document.getElementById('client').value;           // Valor do campo "Cliente"
    const orderNumber = document.getElementById('orderNumber').value; // Valor do campo "Número da OS"
    const description = document.getElementById('errorDescription').value; // Texto da descrição do erro
    const date = new Date().toLocaleString('pt-BR');                  // Data e hora atual formatada

    // Adiciona objeto de erro ao array
    errors.push({ date, client, operator: selectedOperator, orderNumber, description });
    saveStorage();                      // Salva array atualizado no localStorage
    form.reset();                       // Limpa campos do formulário
    selectedOperator = null;            // Zera operador selecionado
    operatorButton.textContent = 'Selecione um Operador'; // Reseta texto do botão

    // Atualiza lista detalhada e gráfico
    generateDropdown();
    generateChart();
  });

  // Ao carregar a página pela primeira vez, chama essas funções para exibir o estado inicial
  renderOperators();    // Renderiza lista de operadores (caso haja no localStorage)
  generateDropdown();   // Gera dropdown detalhado (vai ficar vazio se não houver erros)
  generateChart();      // Gera gráfico (vai ficar sem dados)
});
