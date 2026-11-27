import PDFDocument from 'pdfkit';

export interface CertificatePdfData {
  verificationCode: string;
  recipientName: string;
  activityTitle: string;
  activityType: string;
  issuerName: string;
  workloadHours: number | null;
  issuedAt: Date;
}

export function generateCertificatePdfBuffer(data: CertificatePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 50,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const width = doc.page.width;
    const height = doc.page.height;

    // Moldura externa e interna para detalhamento
    doc
      .rect(25, 25, width - 50, height - 50)
      .lineWidth(3)
      .stroke('#1E3A8A');

    doc
      .rect(33, 33, width - 66, height - 66)
      .lineWidth(1)
      .stroke('#93C5FD');

    // Cabeçalho com a Instituição Emissora
    doc
      .moveDown(1.5)
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#1E3A8A')
      .text(data.issuerName.toUpperCase(), { align: 'center' });

    // Título principal do certficado abaixo do cabeçalho
    doc
      .moveDown(0.8)
      .font('Helvetica-Bold')
      .fontSize(32)
      .fillColor('#111827')
      .text('CERTIFICADO', { align: 'center' });

    // Texto informativo de certificação
    doc
      .moveDown(1.2)
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#374151')
      .text('Certificamos para os devidos fins que', { align: 'center' });

    // O nome do participante
    doc
      .moveDown(0.6)
      .font('Helvetica-Bold')
      .fontSize(26)
      .fillColor('#1E40AF')
      .text(data.recipientName, { align: 'center' });

    // Classíca descrição da atividade
    const workloadText = data.workloadHours
      ? `, com carga horária total de ${data.workloadHours} hora(s)`
      : '';

    doc
      .moveDown(0.8)
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#374151')
      .text(
        `participou da atividade "${data.activityTitle}" (${data.activityType})${workloadText}.`,
        80,
        doc.y,
        { align: 'center', width: width - 160 }
      );

    // Aqui a data de emissão
    const formattedDate = data.issuedAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    doc
      .moveDown(1.5)
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#4B5563')
      .text(`Emitido em ${formattedDate}`, { align: 'center' });

    // Esse é o rodapé com código de verificação
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1F2937')
      .text(
        `Código de Autenticidade: ${data.verificationCode}`,
        50,
        height - 75,
        { align: 'center', width: width - 100 }
      );

    doc.end();
  });
}