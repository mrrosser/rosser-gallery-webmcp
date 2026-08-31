export const TOOLSET_VERSION = '1.0.0' as const;

export type WorkId =
  | 'the-braider'
  | 'the-nurturer'
  | 'transceiver'
  | 'the-wave'
  | 'bearer-of-the-code';

export type FinishId =
  | 'pla-basic-black'
  | 'pla-basic-jade-white'
  | 'pla-metal-iron-gray'
  | 'pla-silk-plus-gold';

export type Fulfillment = 'pickup_new_orleans' | 'delivery_quote';
export type InteractionSource = 'manual' | 'webmcp';

export interface MiniConfiguration {
  mode: 'mini';
  workId: WorkId;
  finishId: FinishId;
  quantity: number;
  signedBase: boolean;
  fulfillment: Fulfillment;
  unitPriceUsd: 80;
}

export interface CustomScaleConfiguration {
  mode: 'custom_scale';
  workId: WorkId;
  finishId: FinishId;
  requestedHeightIn: number;
  planningLowUsd: number;
  planningHighUsd: number;
}

export type ArtworkConfiguration = MiniConfiguration | CustomScaleConfiguration;

export interface QuoteReview {
  reviewId: string;
  expiresAt: string;
  configuration: CustomScaleConfiguration;
  disclaimer: string;
}

export interface CheckoutReview {
  reviewId: string;
  expiresAt: string;
  configuration: MiniConfiguration;
  totalUsd: number;
  requiresUserConfirmation: true;
}

export interface ActivityEntry {
  id: string;
  correlationId: string;
  createdAt: string;
  source: InteractionSource;
  label: string;
  reversible: boolean;
}

export interface CollectorState {
  revision: number;
  selectedWorkId: WorkId;
  viewMode: 'poster' | '3d';
  configuration: ArtworkConfiguration | null;
  quoteReview: QuoteReview | null;
  checkoutReview: CheckoutReview | null;
  statusMessage: string;
  activity: ActivityEntry[];
  canUndo: boolean;
}

export interface VerificationEnvelope<T = Record<string, never>> {
  toolset_version: typeof TOOLSET_VERSION;
  correlation_id: string;
  status: 'ok' | 'rejected';
  code: string;
  effect: string;
  state_revision: number;
  data?: T;
  next_action?: string;
}

export interface ToolExecutionContext {
  source: InteractionSource;
  correlationId: string;
}
