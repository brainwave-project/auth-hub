/**
 * Auth-hub Kafka event emitter.
 *
 * Singleton producer — initialised once in app.ts, then imported and used
 * fire-and-forget in route handlers. A Kafka outage NEVER blocks auth responses.
 */

import { randomUUID } from 'crypto';
import {
  createEventProducer,
  emitEvent,
  KAFKA_TOPICS,
  AuditAction,
  type EventProducer,
  type DomainEvent,
} from '@brainwave-project/core';

let producer: EventProducer | null = null;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function initAuthEventProducer(brokers: string[]): Promise<void> {
  producer = await createEventProducer({ brokers, clientId: 'auth-hub' });
}

export async function disconnectAuthEventProducer(): Promise<void> {
  await producer?.disconnect();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function build(
  action: DomainEvent['action'],
  outcome: DomainEvent['outcome'],
  actorId: string,
  opts?: {
    email?:         string;
    correlationId?: string;
    metadata?:      Record<string, unknown>;
  },
): DomainEvent {
  return {
    eventId:       randomUUID(),
    occurredAt:    new Date().toISOString(),
    service:       'auth-hub',
    action,
    outcome,
    actor:         { userId: actorId, email: opts?.email },
    correlationId: opts?.correlationId,
    metadata:      opts?.metadata,
  };
}

function emit(event: DomainEvent): void {
  if (!producer) return; // Kafka not initialised — safe no-op
  emitEvent(producer, KAFKA_TOPICS.AUTH, event);
}

// ---------------------------------------------------------------------------
// Typed emitters — one function per material action
// ---------------------------------------------------------------------------

export function emitLoginSuccess(actorId: string, opts?: { email?: string; correlationId?: string }): void {
  emit(build(AuditAction.LOGIN_SUCCESS, 'SUCCESS', actorId, opts));
}

export function emitLoginFailure(opts?: { email?: string; correlationId?: string }): void {
  emit(build(AuditAction.LOGIN_FAILURE, 'FAILURE', 'anonymous', opts));
}

export function emitLogout(actorId: string, opts?: { correlationId?: string }): void {
  emit(build(AuditAction.LOGOUT, 'SUCCESS', actorId, opts));
}

export function emitTokenRefreshed(actorId: string, opts?: { correlationId?: string }): void {
  emit(build(AuditAction.TOKEN_REFRESHED, 'SUCCESS', actorId, opts));
}
