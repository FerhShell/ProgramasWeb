const dropBox = document.getElementById('dropBox');

dropBox.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropBox.style.borderColor = '#00ff99';
});

dropBox.addEventListener('dragleave', function(e) {
    e.preventDefault();
    dropBox.style.borderColor = '#ff0000';
});

dropBox.addEventListener('drop', function(e) {
    e.preventDefault();
    dropBox.style.borderColor = '#ff0000';
    
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(event.target.result, "text/xml");

        // Dados principais
        const criada = formatarData(xmlDoc.querySelector('Created').textContent);
        const comecou = formatarHora(xmlDoc.querySelector('Started')?.textContent);
        const finalizou = formatarHora(xmlDoc.querySelector('Exposed').textContent);
        const marca = xmlDoc.querySelector('Brand').textContent;

        document.getElementById('criada').textContent = criada;
        document.getElementById('comecou').textContent = comecou || '-';
        document.getElementById('finalizou').textContent = finalizou;
        document.getElementById('marca').textContent = marca;

        // Arquivos agrupados por OrderId
        const imagens = xmlDoc.querySelectorAll('Image');
        const grupos = {};

        imagens.forEach(img => {
            const fileName = img.querySelector('File').textContent;
            const orderId = img.querySelector('OrderId').textContent;

            if (!grupos[orderId]) {
                grupos[orderId] = [];
            }
            grupos[orderId].push(fileName);
        });

        // Mostrar por grupos
        const blocos = document.getElementById('blocosArquivos');
        blocos.innerHTML = '';

        Object.keys(grupos).sort().forEach(orderId => {
            const box = document.createElement('div');
            box.classList.add('blocobox');

            const titulo = document.createElement('h3');
            titulo.textContent = `Grupo: ${orderId}`;
            box.appendChild(titulo);

            const ul = document.createElement('ul');

            grupos[orderId].sort().forEach(file => {
                const li = document.createElement('li');
                li.textContent = file;
                ul.appendChild(li);
            });

            box.appendChild(ul);
            blocos.appendChild(box);
        });
    };

    reader.readAsText(file);
});

// Formatar data: YYYY-MM-DDTHH:MM:SS → DD/MM/AAAA
function formatarData(dataStr) {
    const data = new Date(dataStr);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

// Formatar hora: YYYY-MM-DDTHH:MM:SS → HH:MM
function formatarHora(dataStr) {
    if (!dataStr) return null;
    const data = new Date(dataStr);
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    return `${hora}:${minuto}`;
}
