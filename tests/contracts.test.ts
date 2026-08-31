import { describe, expect, it } from 'vitest';
import {
  TOOL_CONTRACTS,
  configureArtworkSchema,
  openSquareCheckoutSchema,
  searchCollectionSchema,
} from '../src/core/contracts';

describe('WebMCP contracts', () => {
  it('exposes exactly the seven approved names in journey order', () => {
    expect(TOOL_CONTRACTS.map(({ name }) => name)).toEqual([
      'search_collection',
      'inspect_artwork',
      'present_artwork',
      'configure_artwork',
      'prepare_custom_quote',
      'prepare_checkout',
      'open_square_checkout',
    ]);
  });

  it('marks only discovery tools read-only', () => {
    expect(TOOL_CONTRACTS.map(({ name, readOnly }) => [name, readOnly])).toEqual([
      ['search_collection', true],
      ['inspect_artwork', true],
      ['present_artwork', false],
      ['configure_artwork', false],
      ['prepare_custom_quote', false],
      ['prepare_checkout', false],
      ['open_square_checkout', false],
    ]);
  });

  it('rejects unreviewed fields and invalid scale increments', () => {
    expect(searchCollectionSchema.safeParse({ intent: 'trust', arbitrary_url: 'https://example.com' }).success).toBe(false);
    expect(configureArtworkSchema.safeParse({
      mode: 'mini',
      work_id: 'the-braider',
      finish_id: 'pla-basic-black',
      quantity: 1,
      signed_base: true,
      fulfillment: 'pickup_new_orleans',
      expected_revision: 1,
      price_usd: 1,
    }).success).toBe(false);
    expect(configureArtworkSchema.safeParse({
      mode: 'custom_scale',
      work_id: 'the-braider',
      finish_id: 'pla-metal-iron-gray',
      requested_height_in: 18.25,
      expected_revision: 1,
    }).success).toBe(false);
  });

  it('accepts only opaque UUID checkout reviews', () => {
    expect(openSquareCheckoutSchema.safeParse({ review_id: 'square-provider-id', expected_revision: 3 }).success).toBe(false);
    expect(openSquareCheckoutSchema.safeParse({ review_id: '00000000-0000-4000-8000-000000000001', expected_revision: 3 }).success).toBe(true);
  });
});
