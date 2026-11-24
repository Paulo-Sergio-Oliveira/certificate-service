import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { certificateRoutes } from './routes/certificates';
import { healthRoutes } from './routes/health';

const app = Fastify({ logger: false });

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(cors, { origin: '*' });

app.register(swagger, {
  openapi: {
    info: {
      title: 'Certificate Service API (SOA)',
      description:
        'Serviço reutilizável para emissão, listagem e validação de certificados, com suporte a Retry e Circuit Breaker.',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
});

app.register(swaggerUi, {
  routePrefix: '/docs',
});

app.register(healthRoutes);
app.register(certificateRoutes);

const port = Number(process.env.PORT) || 3333;

app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`Certificate Service rodando em http://localhost:${port}`);
  console.log(`Documentação OpenAPI/Swagger em http://localhost:${port}/docs`);
});