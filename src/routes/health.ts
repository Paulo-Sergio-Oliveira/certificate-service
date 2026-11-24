import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getCircuitBreakerStatus } from '../resilience/db-policy';

export async function healthRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/api/v1/health',
    {
      schema: {
        tags: ['Monitoramento'],
        summary: 'Verifica a saúde do serviço e o estado do Circuit Breaker',
        response: {
          200: z.object({
            status: z.string(),
            service: z.string(),
            circuitBreakerState: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    async () => {
      return {
        status: 'UP',
        service: 'certificate-service',
        circuitBreakerState: getCircuitBreakerStatus(),
        timestamp: new Date().toISOString(),
      };
    }
  );
}