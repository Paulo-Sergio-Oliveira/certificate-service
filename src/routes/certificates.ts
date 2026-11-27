import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { BrokenCircuitError } from 'cockatiel';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { executeWithResilience } from '../resilience/db-policy';
import { generateVerificationCode } from '../utils/code-generator';
import { generateCertificatePdfBuffer } from '../utils/pdf-generator';

const certificateResponseSchema = z.object({
  id: z.string().uuid(),
  verificationCode: z.string(),
  recipientName: z.string(),
  recipientEmail: z.string(),
  activityTitle: z.string(),
  activityType: z.string(),
  issuerName: z.string(),
  workloadHours: z.number().nullable(),
  issuedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

function formatCertificate(cert: any) {
  return {
    ...cert,
    issuedAt: cert.issuedAt.toISOString(),
    metadata: (cert.metadata as Record<string, unknown>) ?? null,
  };
}

export async function certificateRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // Parte de emissão de certificado
  server.post(
    '/api/v1/certificates',
    {
      schema: {
        tags: ['Certificados'],
        summary: 'Emite um novo certificado genérico',
        body: z.object({
          recipientName: z.string().min(2),
          recipientEmail: z.string().email(),
          activityTitle: z.string().min(2),
          activityType: z.string().min(2).default('COURSE'),
          issuerName: z.string().min(2),
          workloadHours: z.number().int().positive().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
        response: {
          201: certificateResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const data = request.body;
      const verificationCode = generateVerificationCode();

      try {
        const created = await executeWithResilience(() =>
          prisma.certificate.create({
            data: {
              verificationCode,
              recipientName: data.recipientName,
              recipientEmail: data.recipientEmail,
              activityTitle: data.activityTitle,
              activityType: data.activityType,
              issuerName: data.issuerName,
              workloadHours: data.workloadHours,
              metadata: data.metadata ? (data.metadata as any) : undefined,
            },
          })
        );

        return reply.status(201).send(formatCertificate(created));
      } catch (err) {
        const isCircuitOpen = err instanceof BrokenCircuitError;
        return reply.status(503).send({
          error: isCircuitOpen ? 'CIRCUIT_OPEN' : 'DATABASE_UNAVAILABLE',
          message: isCircuitOpen
            ? 'Circuito aberto: o serviço de persistência está temporariamente indisponível.'
            : 'Falha ao emitir certificado após múltiplas tentativas.',
        });
      }
    }
  );

  // Aqui é a listagem de certificados com filtros opcionais
  server.get(
    '/api/v1/certificates',
    {
      schema: {
        tags: ['Certificados'],
        summary: 'Lista certificados emitidos (filtrável por e-mail, emissor ou tipo)',
        querystring: z.object({
          recipientEmail: z.string().email().optional(),
          issuerName: z.string().optional(),
          activityType: z.string().optional(),
        }),
        response: {
          200: z.array(certificateResponseSchema),
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { recipientEmail, issuerName, activityType } = request.query;

      try {
        const certificates = await executeWithResilience(() =>
          prisma.certificate.findMany({
            where: {
              ...(recipientEmail && { recipientEmail }),
              ...(issuerName && { issuerName }),
              ...(activityType && { activityType }),
            },
            orderBy: { issuedAt: 'desc' },
          })
        );

        return reply.status(200).send(certificates.map(formatCertificate));
      } catch (err) {
        const isCircuitOpen = err instanceof BrokenCircuitError;
        return reply.status(503).send({
          error: isCircuitOpen ? 'CIRCUIT_OPEN' : 'DATABASE_UNAVAILABLE',
          message: 'Não foi possível consultar os certificados no momento.',
        });
      }
    }
  );

  // Parte de validação de certificado pelo código de verificação
  server.get(
    '/api/v1/certificates/verify/:code',
    {
      schema: {
        tags: ['Certificados'],
        summary: 'Valida a autenticidade de um certificado pelo código',
        params: z.object({
          code: z.string().min(4),
        }),
        response: {
          200: z.object({
            valid: z.boolean(),
            certificate: certificateResponseSchema,
          }),
          404: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { code } = request.params;

      try {
        const certificate = await executeWithResilience(() =>
          prisma.certificate.findUnique({
            where: { verificationCode: code.toUpperCase() },
          })
        );

        if (!certificate) {
          return reply.status(404).send({
            error: 'CERTIFICATE_NOT_FOUND',
            message: `Nenhum certificado encontrado com o código ${code}.`,
          });
        }

        return reply.status(200).send({
          valid: true,
          certificate: formatCertificate(certificate),
        });
      } catch (err) {
        const isCircuitOpen = err instanceof BrokenCircuitError;
        return reply.status(503).send({
          error: isCircuitOpen ? 'CIRCUIT_OPEN' : 'DATABASE_UNAVAILABLE',
          message: 'Serviço temporariamente indisponível para validação.',
        });
      }
    }
  );

  // Rota que permite gerar e baixar certificado em PDF pelo código de verificação
  server.get(
    '/api/v1/certificates/:code/pdf',
    {
      schema: {
        tags: ['Certificados'],
        summary: 'Gera e retorna o certificado em formato PDF',
        params: z.object({
          code: z.string().min(4),
        }),
        response: {
          404: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { code } = request.params;

      try {
        const certificate = await executeWithResilience(() =>
          prisma.certificate.findUnique({
            where: { verificationCode: code.toUpperCase() },
          })
        );

        if (!certificate) {
          return reply.status(404).send({
            error: 'CERTIFICATE_NOT_FOUND',
            message: `Nenhum certificado encontrado com o código ${code}.`,
          });
        }

        const pdfBuffer = await generateCertificatePdfBuffer({
          verificationCode: certificate.verificationCode,
          recipientName: certificate.recipientName,
          activityTitle: certificate.activityTitle,
          activityType: certificate.activityType,
          issuerName: certificate.issuerName,
          workloadHours: certificate.workloadHours,
          issuedAt: certificate.issuedAt,
        });

        return reply
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `inline; filename="${certificate.verificationCode}.pdf"`
          )
          .send(pdfBuffer as any);
      } catch (err) {
        const isCircuitOpen = err instanceof BrokenCircuitError;
        return reply.status(503).send({
          error: isCircuitOpen ? 'CIRCUIT_OPEN' : 'DATABASE_UNAVAILABLE',
          message: 'Serviço temporariamente indisponível para geração do PDF.',
        });
      }
    }
  );
}