import type { InteractionSource } from './types';

export interface SafeLogEvent {
  event: 'tool_execution' | 'tool_registration' | 'manual_action';
  tool_name?: string;
  correlation_id: string;
  source: InteractionSource;
  status: 'ok' | 'rejected';
  code: string;
  state_revision: number;
}

export function logSafeEvent(event: SafeLogEvent): void {
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: event.status === 'ok' ? 'info' : 'warn',
    ...event,
  }));
}
