if (app.documents.length > 0) {
    var doc = app.activeDocument;

    // Rotacionar 90 graus
    doc.rotateCanvas(90);

    // Zoom para encaixar na tela
    app.bringToFront();
    app.runMenuItem(charIDToTypeID('FtOn'));

    alert("Imagem rotacionada e centralizada.\nAgora pressione Ctrl + P para imprimir.");
} else {
    alert("Nenhum documento aberto.");
}
