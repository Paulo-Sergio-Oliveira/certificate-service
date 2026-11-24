import {
  CircuitBreakerPolicy,
  CircuitState,
  ConsecutiveBreaker,
  ExponentialBackoff,
  circuitBreaker,
  handleAll,
  retry,
  wrap,
} from 'cockatiel';

// Essa é a política de Retry. Ela realiza até 3 retentativas com atraso exponencial
const retryPolicy = retry(handleAll, {
  maxAttempts: 3,
  backoff: new ExponentialBackoff({
    initialDelay: 300,
    maxDelay: 2000,
  }),
});

retryPolicy.onRetry((data) => {
  console.warn(
    `[RETRY] Falha ao acessar o banco de certificados. Tentativa ${data.attempt}/3 em ${data.delay}ms...`
  );
});

// Essa é a política de Circuit Breaker. Ela abre após 3 falhas seguidas e aguarda 15s para testar recuperação
export const dbCircuitBreaker: CircuitBreakerPolicy = circuitBreaker(handleAll, {
  halfOpenAfter: 15_000,
  breaker: new ConsecutiveBreaker(3),
});

dbCircuitBreaker.onStateChange((state) => {
  const stateName = CircuitState[state];
  console.warn(`[CIRCUIT BREAKER] Estado alterado para: ${stateName}`);
});

// Aqui é uma política combinada onde o Retry envolve o Circuit Breaker
const resilientDbPolicy = wrap(retryPolicy, dbCircuitBreaker);

export async function executeWithResilience<T>(operation: () => Promise<T>): Promise<T> {
  return resilientDbPolicy.execute(operation);
}

export function getCircuitBreakerStatus(): string {
  return CircuitState[dbCircuitBreaker.state];
}