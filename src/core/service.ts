import {
  ARTWORKS,
  FINISHES,
  curateArtworks,
  estimateCustomScale,
  getArtwork,
  getFinish,
} from './catalog';
import type {
  ConfigureArtworkInput,
  InspectArtworkInput,
  OpenSquareCheckoutInput,
  PrepareCheckoutInput,
  PrepareCustomQuoteInput,
  PresentArtworkInput,
  SearchCollectionInput,
} from './contracts';
import { logSafeEvent } from './logger';
import {
  TOOLSET_VERSION,
  type ActivityEntry,
  type ArtworkConfiguration,
  type CheckoutReview,
  type CollectorState,
  type QuoteReview,
  type ToolExecutionContext,
  type VerificationEnvelope,
} from './types';

type Listener = () => void;

interface VisualSnapshot {
  selectedWorkId: CollectorState['selectedWorkId'];
  viewMode: CollectorState['viewMode'];
  configuration: ArtworkConfiguration | null;
  quoteReview: QuoteReview | null;
  checkoutReview: CheckoutReview | null;
  statusMessage: string;
}

interface ServiceDependencies {
  now?: () => Date;
  idFactory?: () => string;
}

const initialState: CollectorState = {
  revision: 1,
  selectedWorkId: 'the-braider',
  viewMode: 'poster',
  configuration: null,
  quoteReview: null,
  checkoutReview: null,
  statusMessage: 'Tell us what the piece should mean, or explore the collection manually.',
  activity: [],
  canUndo: false,
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createCorrelationId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `rg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class CollectorRoomService {
  private state: CollectorState = clone(initialState);
  private readonly listeners = new Set<Listener>();
  private readonly history: VisualSnapshot[] = [];
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(dependencies: ServiceDependencies = {}) {
    this.now = dependencies.now ?? (() => new Date());
    this.idFactory = dependencies.idFactory ?? createCorrelationId;
  }

  getSnapshot = (): CollectorState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  private context(source: ToolExecutionContext['source']): ToolExecutionContext {
    return { source, correlationId: createCorrelationId() };
  }

  manualContext(): ToolExecutionContext {
    return this.context('manual');
  }

  webMcpContext(): ToolExecutionContext {
    return this.context('webmcp');
  }

  private visualSnapshot(): VisualSnapshot {
    const { selectedWorkId, viewMode, configuration, quoteReview, checkoutReview, statusMessage } = this.state;
    return clone({ selectedWorkId, viewMode, configuration, quoteReview, checkoutReview, statusMessage });
  }

  private envelope<T>(
    context: ToolExecutionContext,
    status: VerificationEnvelope['status'],
    code: string,
    effect: string,
    data?: T,
    nextAction?: string,
  ): VerificationEnvelope<T> {
    return {
      toolset_version: TOOLSET_VERSION,
      correlation_id: context.correlationId,
      status,
      code,
      effect,
      state_revision: this.state.revision,
      ...(data === undefined ? {} : { data }),
      ...(nextAction === undefined ? {} : { next_action: nextAction }),
    };
  }

  private log(
    context: ToolExecutionContext,
    toolName: string,
    status: VerificationEnvelope['status'],
    code: string,
  ): void {
    logSafeEvent({
      event: context.source === 'webmcp' ? 'tool_execution' : 'manual_action',
      tool_name: toolName,
      correlation_id: context.correlationId,
      source: context.source,
      status,
      code,
      state_revision: this.state.revision,
    });
  }

  private reject<T>(
    context: ToolExecutionContext,
    toolName: string,
    code: string,
    effect: string,
    nextAction?: string,
  ): VerificationEnvelope<T> {
    this.log(context, toolName, 'rejected', code);
    return this.envelope<T>(context, 'rejected', code, effect, undefined, nextAction);
  }

  rejectInvalidInput(toolName: string, context: ToolExecutionContext): VerificationEnvelope<{ field_count: number }> {
    this.log(context, toolName, 'rejected', 'invalid_input');
    return this.envelope(
      context,
      'rejected',
      'invalid_input',
      'No page or commerce state changed.',
      { field_count: 0 },
      'Use only the documented strict input schema.',
    );
  }

  private rejectStale<T>(
    expectedRevision: number,
    context: ToolExecutionContext,
    toolName: string,
  ): VerificationEnvelope<T> | null {
    if (expectedRevision === this.state.revision) return null;
    return this.reject<T>(
      context,
      toolName,
      'stale_state',
      'No page state changed because the human or another tool changed the room.',
      `Inspect the current state and retry with expected_revision ${this.state.revision}.`,
    );
  }

  private commit(
    context: ToolExecutionContext,
    label: string,
    next: Partial<VisualSnapshot>,
  ): void {
    this.history.push(this.visualSnapshot());
    const entry: ActivityEntry = {
      id: this.idFactory(),
      correlationId: context.correlationId,
      createdAt: this.now().toISOString(),
      source: context.source,
      label,
      reversible: true,
    };
    this.state = {
      ...this.state,
      ...clone(next),
      revision: this.state.revision + 1,
      activity: [entry, ...this.state.activity].slice(0, 12),
      canUndo: true,
    };
    this.emit();
  }

  undo(): VerificationEnvelope<Record<string, unknown>> {
    const context = this.manualContext();
    const previous = this.history.pop();
    if (!previous) {
      return this.reject<Record<string, unknown>>(context, 'undo', 'nothing_to_undo', 'No page state changed.');
    }
    const entry: ActivityEntry = {
      id: this.idFactory(),
      correlationId: context.correlationId,
      createdAt: this.now().toISOString(),
      source: 'manual',
      label: 'Undid the latest visible change',
      reversible: false,
    };
    this.state = {
      ...this.state,
      ...clone(previous),
      revision: this.state.revision + 1,
      activity: [entry, ...this.state.activity].slice(0, 12),
      canUndo: this.history.length > 0,
    };
    this.emit();
    this.log(context, 'undo', 'ok', 'undone');
    return this.envelope<Record<string, unknown>>(context, 'ok', 'undone', 'The latest visible change was restored.', { restored: true });
  }

  searchCollection(
    input: SearchCollectionInput,
    context: ToolExecutionContext,
  ): VerificationEnvelope<{ matches: Array<Record<string, unknown>> }> {
    let matches = curateArtworks(input.intent, input.maximum_budget_usd);
    if (input.availability === 'commission') {
      matches = matches.filter(({ customScaleEligible }) => customScaleEligible);
    }
    const data = {
      matches: matches.map((artwork) => ({
        work_id: artwork.id,
        title: artwork.title,
        story: artwork.story,
        mini_price_usd: artwork.miniPriceUsd,
        availability: artwork.availability,
        spatial_eligible: artwork.spatialEligible,
        custom_scale_eligible: artwork.customScaleEligible,
      })),
    };
    this.log(context, 'search_collection', 'ok', 'collection_curated');
    return this.envelope(
      context,
      'ok',
      'collection_curated',
      'Returned reviewed matches without changing the page or retaining the intent.',
      data,
      matches.length ? 'Inspect or present one returned work.' : 'Broaden the budget or availability filter.',
    );
  }

  inspectArtwork(
    input: InspectArtworkInput,
    context: ToolExecutionContext,
  ): VerificationEnvelope<Record<string, unknown>> {
    const artwork = getArtwork(input.work_id);
    const data = {
      work_id: artwork.id,
      title: artwork.title,
      series: artwork.series,
      artist: 'Marcus Rosser',
      story: artwork.story,
      availability: artwork.availability,
      mini_price_usd: artwork.miniPriceUsd,
      finish_options: FINISHES.map(({ id, label }) => ({ finish_id: id, label })),
      finish_note: 'Finish is a studio preference pending confirmation; it does not change the Mini price.',
      signed_base_note: 'Signed-base requests are preferences pending studio confirmation.',
      spatial_eligible: artwork.spatialEligible,
      native_ar_requires_human_click: true,
      custom_scale_eligible: artwork.customScaleEligible,
      asset_credit: artwork.spatialEligible ? 'The Braider by Marcus Rosser · media © RT Solutions' : undefined,
    };
    this.log(context, 'inspect_artwork', 'ok', 'artwork_inspected');
    return this.envelope(context, 'ok', 'artwork_inspected', 'Returned reviewed artwork facts without changing the page.', data, 'Present the work or compare another reviewed candidate.');
  }

  presentArtwork(
    input: PresentArtworkInput,
    context: ToolExecutionContext,
  ): VerificationEnvelope<{ work_id: string; view_mode: string }> {
    const stale = this.rejectStale<{ work_id: string; view_mode: string }>(input.expected_revision, context, 'present_artwork');
    if (stale) return stale;
    const artwork = getArtwork(input.work_id);
    if (input.open_3d && !artwork.spatialEligible) {
      return this.reject(context, 'present_artwork', 'spatial_asset_unavailable', 'No page state changed.', 'Present this work as a story card or choose The Braider for reviewed web 3D.');
    }
    const viewMode = input.open_3d ? '3d' : 'poster';
    this.commit(context, `${artwork.title} presented in ${viewMode === '3d' ? 'web 3D' : 'the story view'}`, {
      selectedWorkId: artwork.id,
      viewMode,
      configuration: this.state.configuration?.workId === artwork.id ? this.state.configuration : null,
      quoteReview: null,
      checkoutReview: null,
      statusMessage: `${artwork.title} is now presented in ${viewMode === '3d' ? 'interactive web 3D' : 'the story view'}.`,
    });
    this.log(context, 'present_artwork', 'ok', 'artwork_presented');
    return this.envelope(context, 'ok', 'artwork_presented', 'The visible Collector’s Room presentation changed.', { work_id: artwork.id, view_mode: viewMode }, 'Review the visible presentation or configure the artwork.');
  }

  configureArtwork(
    input: ConfigureArtworkInput,
    context: ToolExecutionContext,
  ): VerificationEnvelope<Record<string, unknown>> {
    const stale = this.rejectStale<Record<string, unknown>>(input.expected_revision, context, 'configure_artwork');
    if (stale) return stale;
    const artwork = getArtwork(input.work_id);
    const finish = getFinish(input.finish_id);

    let configuration: ArtworkConfiguration;
    let data: Record<string, unknown>;
    if (input.mode === 'mini') {
      configuration = {
        mode: 'mini', workId: artwork.id, finishId: finish.id, quantity: input.quantity,
        signedBase: input.signed_base, fulfillment: input.fulfillment, unitPriceUsd: 80,
      };
      data = {
        mode: 'mini', work_id: artwork.id, finish: finish.label, quantity: input.quantity,
        signed_base_requested: input.signed_base, fulfillment: input.fulfillment,
        unit_price_usd: 80, subtotal_usd: input.quantity * 80,
      };
    } else {
      if (!artwork.customScaleEligible) {
        return this.reject(context, 'configure_artwork', 'custom_scale_unavailable', 'No page state changed.', 'Choose The Braider for the reviewed custom-scale study.');
      }
      const estimate = estimateCustomScale(input.requested_height_in, finish.id);
      configuration = {
        mode: 'custom_scale', workId: artwork.id, finishId: finish.id,
        requestedHeightIn: input.requested_height_in,
        planningLowUsd: estimate.low, planningHighUsd: estimate.high,
      };
      data = {
        mode: 'custom_scale', work_id: artwork.id, finish: finish.label,
        requested_height_in: input.requested_height_in,
        planning_range_usd: { low: estimate.low, high: estimate.high },
        estimate_status: 'nonbinding_planning_only',
      };
    }

    this.commit(context, `${artwork.title} configured as ${input.mode === 'mini' ? 'a Mini' : 'a custom-scale study'}`, {
      selectedWorkId: artwork.id,
      configuration,
      quoteReview: null,
      checkoutReview: null,
      statusMessage: input.mode === 'mini'
        ? `${artwork.title} Mini configured in ${finish.label}. Review the visible details before checkout.`
        : `${artwork.title} custom-scale study configured at ${input.requested_height_in} inches. The range is planning-only.`,
    });
    this.log(context, 'configure_artwork', 'ok', 'artwork_configured');
    return this.envelope(context, 'ok', 'artwork_configured', 'The visible configuration changed; no order or inquiry was created.', data, input.mode === 'mini' ? 'Prepare an exact checkout review.' : 'Prepare the planning-only custom quote review.');
  }

  prepareCustomQuote(
    input: PrepareCustomQuoteInput,
    context: ToolExecutionContext,
  ): VerificationEnvelope<Record<string, unknown>> {
    const stale = this.rejectStale<Record<string, unknown>>(input.expected_revision, context, 'prepare_custom_quote');
    if (stale) return stale;
    const configuration = this.state.configuration;
    if (!configuration || configuration.mode !== 'custom_scale') {
      return this.reject(context, 'prepare_custom_quote', 'custom_configuration_required', 'No page state changed.', 'Configure an eligible custom-scale study first.');
    }
    const review: QuoteReview = {
      reviewId: this.idFactory(),
      expiresAt: new Date(this.now().getTime() + 15 * 60_000).toISOString(),
      configuration: clone(configuration),
      disclaimer: 'Planning range only. Marcus confirms final slicing, material, timing, delivery, and written quote.',
    };
    this.commit(context, 'Custom-scale planning review prepared', {
      quoteReview: review,
      checkoutReview: null,
      statusMessage: 'A nonbinding custom-scale review is visible. No inquiry or order has been submitted.',
    });
    this.log(context, 'prepare_custom_quote', 'ok', 'custom_quote_prepared');
    return this.envelope(context, 'ok', 'custom_quote_prepared', 'Opened a visible, temporary planning review without collecting PII or submitting an inquiry.', {
      review_id: review.reviewId,
      expires_at: review.expiresAt,
      planning_range_usd: { low: configuration.planningLowUsd, high: configuration.planningHighUsd },
      submitted: false,
    }, 'Ask the human to review the visible planning details.');
  }

  prepareCheckout(
    input: PrepareCheckoutInput,
    context: ToolExecutionContext,
  ): VerificationEnvelope<Record<string, unknown>> {
    const stale = this.rejectStale<Record<string, unknown>>(input.expected_revision, context, 'prepare_checkout');
    if (stale) return stale;
    const configuration = this.state.configuration;
    if (!configuration || configuration.mode !== 'mini') {
      return this.reject(context, 'prepare_checkout', 'mini_configuration_required', 'No page state changed.', 'Configure a reviewed Mini first.');
    }
    const review: CheckoutReview = {
      reviewId: this.idFactory(),
      expiresAt: new Date(this.now().getTime() + 10 * 60_000).toISOString(),
      configuration: clone(configuration),
      totalUsd: configuration.quantity * configuration.unitPriceUsd,
      requiresUserConfirmation: true,
    };
    this.commit(context, 'Exact Mini checkout review prepared', {
      checkoutReview: review,
      quoteReview: null,
      statusMessage: 'The exact Mini review is visible. Nothing has been purchased; confirmation is still required.',
    });
    this.log(context, 'prepare_checkout', 'ok', 'checkout_review_prepared');
    return this.envelope(context, 'ok', 'checkout_review_prepared', 'Opened an exact, temporary checkout review without creating a payment.', {
      review_id: review.reviewId,
      expires_at: review.expiresAt,
      total_usd: review.totalUsd,
      requires_user_confirmation: true,
    }, 'Ask for explicit confirmation before calling open_square_checkout with this exact review_id.');
  }

  openSquareCheckout(
    input: OpenSquareCheckoutInput,
    context: ToolExecutionContext,
  ): VerificationEnvelope<Record<string, unknown>> {
    const stale = this.rejectStale<Record<string, unknown>>(input.expected_revision, context, 'open_square_checkout');
    if (stale) return stale;
    const review = this.state.checkoutReview;
    if (!review || review.reviewId !== input.review_id) {
      return this.reject(context, 'open_square_checkout', 'review_mismatch', 'No checkout handoff occurred.', 'Prepare a fresh checkout review and use its exact opaque review_id.');
    }
    if (new Date(review.expiresAt).getTime() <= this.now().getTime()) {
      return this.reject(context, 'open_square_checkout', 'review_expired', 'No checkout handoff occurred.', 'Prepare and confirm a fresh checkout review.');
    }

    this.commit(context, 'Checkout handoff stopped safely at the standalone review boundary', {
      statusMessage: 'Review-only demo: the verified configuration is ready for the production Square adapter. No external page opened and no payment was created.',
    });
    this.log(context, 'open_square_checkout', 'ok', 'checkout_handoff_mocked');
    return this.envelope(context, 'ok', 'checkout_handoff_mocked', 'The standalone demo verified the exact review and stopped before external commerce.', {
      handoff_mode: 'review_only',
      payment_created: false,
      external_navigation: false,
      total_usd: review.totalUsd,
    }, 'Use the production server-validated Square adapter to create the hosted checkout session.');
  }

  reviewedCatalog(): typeof ARTWORKS {
    return ARTWORKS;
  }
}

export const collectorRoomService = new CollectorRoomService();
