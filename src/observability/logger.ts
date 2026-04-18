import { createLogger } from '@brainwave-project/core';

/**
 * Service-scoped Pino logger for auth-hub.
 * All log lines include: time (ISO), level, service=auth-hub, pid.
 * Use logger.child({ correlationId }) inside request handlers.
 */
export const logger = createLogger({
  serviceName: 'auth-hub',
  level:       process.env['LOG_LEVEL'] ?? 'info',
});

export type { Logger } from '@brainwave-project/core';
