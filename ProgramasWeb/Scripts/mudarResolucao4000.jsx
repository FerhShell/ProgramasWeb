if (app.documents.length > 0) {
    var doc = app.activeDocument;

    // Define a nova resolução
    var novaResolucao = 4000;

    // Altera apenas a resolução, mantendo altura e largura (sem reamostrar)
    doc.resizeImage(undefined, undefined, novaResolucao, ResampleMethod.NONE);

    alert("Resolução alterada para 4000 ppi com sucesso!");
} else {
    alert("Nenhum documento aberto.");
}
