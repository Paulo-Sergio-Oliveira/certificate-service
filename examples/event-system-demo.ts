import { ResilientCertificateClient } from './certificate-client';

async function runEventSystemDemo() {
  const client = new ResilientCertificateClient();

  console.log('=== [SISTEMA DE EVENTOS] Emitindo certificado de palestra ===\n');

  const issued = await client.issueCertificate({
    recipientName: 'Paulo Sergio Vieira de Oliveira',
    recipientEmail: 'paulo.sergio@alu.ufc.br',
    activityTitle: 'Arquitetura Orientada a Serviços na Prática',
    activityType: 'LECTURE',
    issuerName: 'WTISC - UFC Quixadá',
    workloadHours: 4,
    metadata: {
      evento: 'Workshop de Tecnologia da Informação do Sertão Central',
      local: 'Auditório Bloco 2 - Campus Quixadá',
      palestrante: 'Prof. Francisco Victor',
    },
  });

  console.log('Certificado emitido com sucesso:');
  console.log(issued);

  console.log(`\n=== [VALIDAÇÃO PÚBLICA] Verificando código ${issued.verificationCode} ===\n`);
  const validation = await client.verifyCertificate(issued.verificationCode);
  console.log(validation);
}

runEventSystemDemo().catch((err) => {
  console.error('Falha final no Sistema de Eventos:', err.message);
});