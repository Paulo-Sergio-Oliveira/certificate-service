import {
  CircuitState,
  ConsecutiveBreaker,
  ExponentialBackoff,
  circuitBreaker,
  handleAll,
  retry,
  wrap,
} from 'cockatiel';

export interface IssueCertificatePayload {
  recipientName: string;
  recipientEmail: string;
  activityTitle: string;
  activityType: string;
  issuerName: string;
  workloadHours?: number;
  metadata?: Record<string, unknown>;
}

export class ResilientCertificateClient {
  private baseUrl: string;
  private policy;

  constructor(baseUrl = 'http://localhost:3333') {
    this.baseUrl = baseUrl;

    const retryPolicy = retry(handleAll, {
      maxAttempts: 3,
      backoff: new ExponentialBackoff({ initialDelay: 300, maxDelay: 1500 }),
    });

    retryPolicy.onRetry((data) => {
      console.warn(
        `[CLIENTE - RETRY] Serviço de Certificados indisponível. Tentativa ${data.attempt}/3 em ${data.delay}ms...`
      );
    });

    const breakerPolicy = circuitBreaker(handleAll, {
      halfOpenAfter: 10_000,
      breaker: new ConsecutiveBreaker(3),
    });

    breakerPolicy.onStateChange((state) => {
      console.warn(`[CLIENTE - CIRCUIT BREAKER] Estado alterado para: ${CircuitState[state]}`);
    });

    this.policy = wrap(retryPolicy, breakerPolicy);
  }

  async issueCertificate(payload: IssueCertificatePayload) {
    return this.policy.execute(async () => {
      const response = await fetch(`${this.baseUrl}/api/v1/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status >= 500) {
        throw new Error(`Erro interno no serviço remoto (HTTP ${response.status})`);
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Erro na requisição: ${JSON.stringify(err)}`);
      }

      return response.json();
    });
  }

  async verifyCertificate(code: string) {
    return this.policy.execute(async () => {
      const response = await fetch(`${this.baseUrl}/api/v1/certificates/verify/${code}`);

      if (response.status >= 500) {
        throw new Error(`Erro interno no serviço remoto (HTTP ${response.status})`);
      }

      return response.json();
    });
  }

  async listByEmail(email: string) {
    return this.policy.execute(async () => {
      const response = await fetch(
        `${this.baseUrl}/api/v1/certificates?recipientEmail=${encodeURIComponent(email)}`
      );

      if (response.status >= 500) {
        throw new Error(`Erro interno no serviço remoto (HTTP ${response.status})`);
      }

      return response.json();
    });
  }
}