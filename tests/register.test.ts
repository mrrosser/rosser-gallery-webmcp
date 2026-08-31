import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectorRoomService } from '../src/core/service';
import {
  createWebMcpToolDefinitions,
  registerCollectorRoomTools,
  resetRegistrationForTests,
} from '../src/webmcp/register';

describe('imperative WebMCP registration', () => {
  beforeEach(() => {
    resetRegistrationForTests();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('no-ops cleanly when the browser has no model context', () => {
    const target = {} as Document;
    expect(registerCollectorRoomTools(new CollectorRoomService(), { targetDocument: target })).toEqual({
      status: 'unsupported',
      count: 0,
    });
  });

  it('registers the exact tools once per top-level model context', () => {
    const definitions: WebMcpToolDefinition[] = [];
    const target = {
      modelContext: { registerTool: (definition: WebMcpToolDefinition) => definitions.push(definition) },
    } as unknown as Document;
    const service = new CollectorRoomService();

    expect(registerCollectorRoomTools(service, { targetDocument: target })).toEqual({ status: 'registered', count: 7 });
    expect(registerCollectorRoomTools(service, { targetDocument: target })).toEqual({ status: 'already_registered', count: 7 });
    expect(definitions).toHaveLength(7);
    expect(definitions.map(({ name }) => name)).toEqual([
      'search_collection', 'inspect_artwork', 'present_artwork', 'configure_artwork',
      'prepare_custom_quote', 'prepare_checkout', 'open_square_checkout',
    ]);
    expect(Object.keys(definitions[0]?.annotations ?? {})).toEqual(['readOnlyHint']);
  });

  it('rejects malformed tool input without exposing validation details', async () => {
    const service = new CollectorRoomService();
    const search = createWebMcpToolDefinitions(service).find(({ name }) => name === 'search_collection');
    const result = await search?.execute({ intent: 'trust', url: 'https://untrusted.example' });
    expect(result).toMatchObject({ status: 'rejected', code: 'invalid_input', state_revision: 1 });
    expect(JSON.stringify(result)).not.toContain('untrusted.example');
  });
});
