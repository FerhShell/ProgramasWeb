if (app.documents.length > 0) {
    var doc = app.activeDocument;

    // Caminho para salvar o JPEG (mesma pasta do arquivo aberto)
    var originalPath = doc.path;
    var nomeArquivo = doc.name.replace(/\.[^\.]+$/, ''); // Remove a extensão do nome
    var destino = new File(originalPath + '/' + nomeArquivo + '_MAX.jpg');

    // Opções de exportação para JPEG com qualidade 12 (máxima)
    var jpegOptions = new JPEGSaveOptions();
    jpegOptions.quality = 12;                    // Qualidade máxima
    jpegOptions.formatOptions = FormatOptions.STANDARDBASELINE; // Linha de base "Padrão"
    jpegOptions.embedColorProfile = true;
    jpegOptions.matte = MatteType.NONE;

    doc.saveAs(destino, jpegOptions, true); // true = sobrescreve se existir

    alert("Arquivo salvo como JPEG com qualidade máxima com sucesso!");
} else {
    alert("Nenhum documento aberto.");
}
