import { ResilientCertificateClient } from './certificate-client';

async function runEduHubDemo() {
  const client = new ResilientCertificateClient();

  console.log('=== [EDUHUB - SERVIÇO DE CURSOS] Emitindo certificado de curso ===\n');

  const issued = await client.issueCertificate({
    recipientName: 'Paulo Sergio Vieira de Oliveira',
    recipientEmail: 'paulo.sergio@alu.ufc.br',
    activityTitle: 'Desenvolvimento Back-end com TypeScript e Fastify',
    activityType: 'COURSE',
    issuerName: 'EduHub',
    workloadHours: 40,
    metadata: {
      cursoId: 'CRS-104',
      notaFinal: 9.8,
      instrutor: 'Randson Silva',
    },
  });

  console.log('Certificado do EduHub emitido:');
  console.log(issued);

  console.log('\n=== [EDUHUB - PORTAL DO ALUNO] Listando todos os certificados do e-mail ===\n');
  const allCertificates = await client.listByEmail('paulo.sergio@alu.ufc.br');
  console.log(`Total de certificados encontrados: ${allCertificates.length}`);
  console.table(
    allCertificates.map((c: any) => ({
      codigo: c.verificationCode,
      tipo: c.activityType,
      titulo: c.activityTitle,
      emissor: c.issuerName,
      cargaHoraria: c.workloadHours,
    }))
  );
}

runEduHubDemo().catch((err) => {
  console.error('Falha final no EduHub:', err.message);
});