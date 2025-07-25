document.addEventListener('DOMContentLoaded', () => {
  // === Referência aos elementos ===
  const form = document.getElementById('errorForm');
  const operatorList = document.getElementById('operatorList');
  const operatorButton = document.getElementById('operatorButton');
  const toggleErrosBtn = document.getElementById('toggleErrosBtn');
  const errosDropdown = document.getElementById('errosDropdown');
  const chartCtx = document.getElementById('errorChart').getContext('2d');

  // === Variáveis de estado ===
  let selectedOperator = null;
  let operators = [];
  let errors = [];
  let errorChart = null;

  // === Link da API do Google Apps Script ===
  const API_URL = "https://script.google.com/macros/s/AKfycbyQnsSEagrxy8WvuYQUT87SpBhIIDDKrLZ2bfqULHTxu3bu7W-C-e0eIyopputyMQ8/exec";

  // === Carregar dados da planilha ===
  async function carregarDados() {
    const res = await fetch(API_URL);
    const dados = await res.json();
    errors = dados;
    operators = [...new Set(errors.map(e => e.operator))];
    renderOperators();
    generateDropdown();
    generateChart();
  }

  // === Renderizar lista de operadores ===
  function renderOperators() {
    operators.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    operatorList.innerHTML = operators.map(op =>
      `<label><input type="radio" name="operator" value="${op}" ${selectedOperator === op ? 'checked' : ''}> ${op}</label>`
    ).join('');

    document.querySelectorAll('input[name="operator"]').forEach(i => {
      i.onchange = () => {
        selectedOperator = i.value;
        operatorList.style.display = 'none';
        operatorButton.textContent = `Operador: ${selectedOperator}`;
      };
    });
  }

  // === Alternar visibilidade da lista de operadores ===
  operatorButton.addEventListener('click', () => {
    operatorList.style.display = operatorList.style.display === 'block' ? 'none' : 'block';
  });

  // === Alternar visibilidade do dropdown de erros ===
  toggleErrosBtn.addEventListener('click', () => {
    errosDropdown.classList.toggle('open');
    toggleErrosBtn.classList.toggle('open');
    toggleErrosBtn.textContent = errosDropdown.classList.contains('open') ? 'Ocultar Relatórios de Erros' : 'Ver Relatórios de Erros';
  });

  // === Enviar novo erro para a planilha ===
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!selectedOperator) return alert('Selecione um operador!');

    // Coletar dados do formulário
    const client = document.getElementById('client').value;
    const orderNumber = document.getElementById('orderNumber').value;
    const description = document.getElementById('errorDescription').value;
    const date = new Date().toLocaleString('pt-BR');

    // Montar como formulário tradicional (form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('date', date);
    formData.append('client', client);
    formData.append('operator', selectedOperator);
    formData.append('orderNumber', orderNumber);
    formData.append('description', description);

    try {
      await fetch(API_URL, {
        method: "POST",
        body: formData
      });

      alert("Erro registrado com sucesso!");
      form.reset();
      selectedOperator = null;
      operatorButton.textContent = 'Selecione um Operador';
      await carregarDados();
    } catch (err) {
      alert("Falha ao enviar erro. Verifique sua conexão.");
    }
  });

  // === Agrupar erros por operador ===
  function groupByOperator() {
    return errors.reduce((acc, e, i) => {
      (acc[e.operator] = acc[e.operator] || []).push({ data: e, index: i });
      return acc;
    }, {});
  }

  // === Gerar lista de erros no dropdown ===
  function generateDropdown() {
    errosDropdown.innerHTML = '';
    const grouped = groupByOperator();

    Object.entries(grouped).forEach(([op, arr]) => {
      const opContainer = document.createElement('div');
      opContainer.className = 'operador-erros';

      const header = document.createElement('h3');
      header.textContent = `${op} (${arr.length} erro${arr.length > 1 ? 's' : ''})`;
      opContainer.appendChild(header);

      const listDiv = document.createElement('div');
      listDiv.className = 'erros-lista';
      const ul = document.createElement('ul');

      arr.forEach(({ data: e }) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div>
            <strong>Data:</strong> ${e.date}<br>
            <strong>Cliente:</strong> ${e.client}<br>
            <strong>OS:</strong> ${e.orderNumber}<br>
            ${e.description}
          </div>`;
        ul.appendChild(li);
      });

      listDiv.appendChild(ul);
      opContainer.appendChild(listDiv);

      header.addEventListener('click', () => {
        header.classList.toggle('open');
        listDiv.classList.toggle('open');
      });

      errosDropdown.appendChild(opContainer);
    });
  }

  // === Gerar gráfico com os erros por operador ===
  function generateChart() {
    if (errorChart) errorChart.destroy();

    const grouped = groupByOperator();
    const labels = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const data = labels.map(l => grouped[l].length);
    const palette = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6'];

    errorChart = new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Erros',
          data,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderColor: '#333',
          borderWidth: 1,
          barThickness: 30
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: '#f5f5f5' },
            grid: { color: '#444' }
          },
          y: {
            ticks: { color: '#f5f5f5' },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#f5f5f5',
            anchor: 'end',
            align: 'right',
            font: { size: 14, weight: 'bold' },
            formatter: value => value
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: ctx => `Erros: ${ctx.parsed.x}`
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  // === Inicializar programa carregando os dados ===
  carregarDados();
});
