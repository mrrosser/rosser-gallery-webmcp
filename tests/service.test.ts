import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectorRoomService } from '../src/core/service';

function createService() {
  let id = 0;
  return new CollectorRoomService({
    now: () => new Date('2026-08-30T16:00:00.000Z'),
    idFactory: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
  });
}

describe('CollectorRoomService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('curates trust to The Braider without mutating or logging the intent', () => {
    const service = createService();
    const before = service.getSnapshot();
    const result = service.searchCollection(
      { intent: 'A gift about trust for my sister', maximum_budget_usd: 100 },
      service.webMcpContext(),
    );

    expect(result.status).toBe('ok');
    expect(result.data?.matches[0]?.work_id).toBe('the-braider');
    expect(service.getSnapshot()).toBe(before);
    expect(service.getSnapshot().revision).toBe(1);
    expect(service.getSnapshot().activity).toHaveLength(0);
    const logged = vi.mocked(console.info).mock.calls.flat().join(' ');
    expect(logged).not.toContain('sister');
    expect(logged).not.toContain('trust');
  });

  it('shares visible state, increments revisions, and rejects stale mutations', () => {
    const service = createService();
    const presented = service.presentArtwork(
      { work_id: 'the-braider', open_3d: true, expected_revision: 1 },
      service.webMcpContext(),
    );
    expect(presented.state_revision).toBe(2);
    expect(service.getSnapshot().viewMode).toBe('3d');
    expect(service.getSnapshot().activity[0]?.source).toBe('webmcp');

    const stale = service.configureArtwork(
      {
        mode: 'mini', work_id: 'the-braider', finish_id: 'pla-basic-black', quantity: 1,
        signed_base: true, fulfillment: 'pickup_new_orleans', expected_revision: 1,
      },
      service.webMcpContext(),
    );
    expect(stale).toMatchObject({ status: 'rejected', code: 'stale_state', state_revision: 2 });
    expect(service.getSnapshot().configuration).toBeNull();
  });

  it('builds a deterministic custom-scale range and a non-submitted review', () => {
    const service = createService();
    const configured = service.configureArtwork(
      {
        mode: 'custom_scale', work_id: 'the-braider', finish_id: 'pla-metal-iron-gray',
        requested_height_in: 18, expected_revision: 1,
      },
      service.webMcpContext(),
    );
    expect(configured.data?.planning_range_usd).toEqual({ low: 750, high: 1000 });
    expect(configured.data?.estimate_status).toBe('nonbinding_planning_only');

    const review = service.prepareCustomQuote(
      { expected_revision: 2 },
      service.webMcpContext(),
    );
    expect(review).toMatchObject({ status: 'ok', code: 'custom_quote_prepared', state_revision: 3 });
    expect(review.data).toMatchObject({ submitted: false });
    expect(service.getSnapshot().quoteReview?.disclaimer).toContain('Planning range only');
  });

  it('refuses custom scale for unreviewed works', () => {
    const service = createService();
    const result = service.configureArtwork(
      {
        mode: 'custom_scale', work_id: 'the-wave', finish_id: 'pla-silk-plus-gold',
        requested_height_in: 18, expected_revision: 1,
      },
      service.webMcpContext(),
    );
    expect(result).toMatchObject({ status: 'rejected', code: 'custom_scale_unavailable', state_revision: 1 });
  });

  it('prepares an exact Mini review and keeps the standalone handoff review-only', () => {
    const service = createService();
    service.configureArtwork(
      {
        mode: 'mini', work_id: 'the-braider', finish_id: 'pla-basic-black', quantity: 2,
        signed_base: true, fulfillment: 'pickup_new_orleans', expected_revision: 1,
      },
      service.manualContext(),
    );
    const reviewResult = service.prepareCheckout({ expected_revision: 2 }, service.webMcpContext());
    const reviewId = String(reviewResult.data?.review_id);
    expect(reviewResult.data).toMatchObject({ total_usd: 160, requires_user_confirmation: true });

    const handoff = service.openSquareCheckout(
      { review_id: reviewId, expected_revision: 3 },
      service.webMcpContext(),
    );
    expect(handoff).toMatchObject({ status: 'ok', code: 'checkout_handoff_mocked', state_revision: 4 });
    expect(handoff.data).toMatchObject({ handoff_mode: 'review_only', payment_created: false, external_navigation: false });
  });

  it('undoes a visible change while keeping revision monotonic', () => {
    const service = createService();
    service.presentArtwork(
      { work_id: 'the-wave', open_3d: false, expected_revision: 1 },
      service.manualContext(),
    );
    expect(service.getSnapshot().selectedWorkId).toBe('the-wave');
    const result = service.undo();
    expect(result.status).toBe('ok');
    expect(service.getSnapshot()).toMatchObject({ selectedWorkId: 'the-braider', revision: 3 });
  });
});
