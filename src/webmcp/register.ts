import type { z } from 'zod';
import { TOOL_CONTRACTS } from '../core/contracts';
import { logSafeEvent } from '../core/logger';
import { CollectorRoomService, createCorrelationId } from '../core/service';

let registeredContexts = new WeakSet<object>();

type ParsedInput = z.output<(typeof TOOL_CONTRACTS)[number]['validator']>;

function executeContract(
  service: CollectorRoomService,
  name: (typeof TOOL_CONTRACTS)[number]['name'],
  input: ParsedInput,
): unknown {
  const context = service.webMcpContext();
  switch (name) {
    case 'search_collection':
      return service.searchCollection(input as Parameters<typeof service.searchCollection>[0], context);
    case 'inspect_artwork':
      return service.inspectArtwork(input as Parameters<typeof service.inspectArtwork>[0], context);
    case 'present_artwork':
      return service.presentArtwork(input as Parameters<typeof service.presentArtwork>[0], context);
    case 'configure_artwork':
      return service.configureArtwork(input as Parameters<typeof service.configureArtwork>[0], context);
    case 'prepare_custom_quote':
      return service.prepareCustomQuote(input as Parameters<typeof service.prepareCustomQuote>[0], context);
    case 'prepare_checkout':
      return service.prepareCheckout(input as Parameters<typeof service.prepareCheckout>[0], context);
    case 'open_square_checkout':
      return service.openSquareCheckout(input as Parameters<typeof service.openSquareCheckout>[0], context);
  }
}

export function createWebMcpToolDefinitions(service: CollectorRoomService): WebMcpToolDefinition[] {
  return TOOL_CONTRACTS.map((contract) => ({
    name: contract.name,
    title: contract.title,
    description: contract.description,
    inputSchema: contract.inputSchema,
    annotations: { readOnlyHint: contract.readOnly },
    execute: async (input: unknown) => {
      const parsed = contract.validator.safeParse(input);
      if (!parsed.success) {
        return service.rejectInvalidInput(contract.name, service.webMcpContext());
      }
      return executeContract(service, contract.name, parsed.data);
    },
  }));
}

export interface RegistrationResult {
  status: 'registered' | 'already_registered' | 'unsupported' | 'disabled' | 'failed';
  count: number;
}

export function registerCollectorRoomTools(
  service: CollectorRoomService,
  options: { enabled?: boolean; targetDocument?: Document } = {},
): RegistrationResult {
  const enabled = options.enabled ?? true;
  if (!enabled) return { status: 'disabled', count: 0 };

  const target = options.targetDocument ?? document;
  const modelContext = target.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    return { status: 'unsupported', count: 0 };
  }
  if (registeredContexts.has(modelContext)) {
    return { status: 'already_registered', count: TOOL_CONTRACTS.length };
  }

  const correlationId = createCorrelationId();
  try {
    createWebMcpToolDefinitions(service).forEach((tool) => modelContext.registerTool(tool));
    registeredContexts.add(modelContext);
    logSafeEvent({
      event: 'tool_registration', correlation_id: correlationId, source: 'webmcp', status: 'ok',
      code: 'tools_registered', state_revision: service.getSnapshot().revision,
    });
    return { status: 'registered', count: TOOL_CONTRACTS.length };
  } catch {
    logSafeEvent({
      event: 'tool_registration', correlation_id: correlationId, source: 'webmcp', status: 'rejected',
      code: 'registration_failed', state_revision: service.getSnapshot().revision,
    });
    return { status: 'failed', count: 0 };
  }
}

export function resetRegistrationForTests(): void {
  registeredContexts = new WeakSet<object>();
}
