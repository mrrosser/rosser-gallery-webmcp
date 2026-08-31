import { z } from 'zod';
import { FINISH_IDS, WORK_IDS } from './catalog';

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const expectedRevision = z.number().int().min(1);
const workId = z.enum(WORK_IDS);
const finishId = z.enum(FINISH_IDS);

export const searchCollectionSchema = strictObject({
  intent: z.string().trim().min(1).max(120),
  maximum_budget_usd: z.number().min(1).max(1_000_000).optional(),
  availability: z.enum(['available_now', 'commission']).optional(),
});

export const inspectArtworkSchema = strictObject({ work_id: workId });

export const presentArtworkSchema = strictObject({
  work_id: workId,
  open_3d: z.boolean(),
  expected_revision: expectedRevision,
});

const miniConfigurationSchema = strictObject({
  mode: z.literal('mini'),
  work_id: workId,
  finish_id: finishId,
  quantity: z.number().int().min(1).max(5),
  signed_base: z.boolean(),
  fulfillment: z.enum(['pickup_new_orleans', 'delivery_quote']),
  expected_revision: expectedRevision,
});

const customScaleConfigurationSchema = strictObject({
  mode: z.literal('custom_scale'),
  work_id: workId,
  finish_id: finishId,
  requested_height_in: z.number().min(6).max(60).refine((value) => value * 2 === Math.round(value * 2), {
    message: 'Height must use 0.5-inch increments.',
  }),
  expected_revision: expectedRevision,
});

export const configureArtworkSchema = z.discriminatedUnion('mode', [
  miniConfigurationSchema,
  customScaleConfigurationSchema,
]);

export const prepareCustomQuoteSchema = strictObject({ expected_revision: expectedRevision });
export const prepareCheckoutSchema = strictObject({ expected_revision: expectedRevision });
export const openSquareCheckoutSchema = strictObject({
  review_id: z.string().uuid(),
  expected_revision: expectedRevision,
});

export type SearchCollectionInput = z.infer<typeof searchCollectionSchema>;
export type InspectArtworkInput = z.infer<typeof inspectArtworkSchema>;
export type PresentArtworkInput = z.infer<typeof presentArtworkSchema>;
export type ConfigureArtworkInput = z.infer<typeof configureArtworkSchema>;
export type PrepareCustomQuoteInput = z.infer<typeof prepareCustomQuoteSchema>;
export type PrepareCheckoutInput = z.infer<typeof prepareCheckoutSchema>;
export type OpenSquareCheckoutInput = z.infer<typeof openSquareCheckoutSchema>;

export interface ToolContract {
  name:
    | 'search_collection'
    | 'inspect_artwork'
    | 'present_artwork'
    | 'configure_artwork'
    | 'prepare_custom_quote'
    | 'prepare_checkout'
    | 'open_square_checkout';
  title: string;
  description: string;
  readOnly: boolean;
  inputSchema: Record<string, unknown>;
  validator: z.ZodTypeAny;
}

const workIdJson = { type: 'string', enum: WORK_IDS } as const;
const finishIdJson = { type: 'string', enum: FINISH_IDS } as const;
const expectedRevisionJson = { type: 'integer', minimum: 1 } as const;

export const TOOL_CONTRACTS: readonly ToolContract[] = [
  {
    name: 'search_collection',
    title: 'Search the Rosser Gallery collection',
    description: 'Curate up to three reviewed artworks by meaning, Mini budget, and availability. Read only; does not change the page or retain the visitor intent.',
    readOnly: true,
    validator: searchCollectionSchema,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['intent'],
      properties: {
        intent: { type: 'string', minLength: 1, maxLength: 120 },
        maximum_budget_usd: { type: 'number', minimum: 1, maximum: 1_000_000 },
        availability: { type: 'string', enum: ['available_now', 'commission'] },
      },
    },
  },
  {
    name: 'inspect_artwork',
    title: 'Inspect reviewed artwork details',
    description: 'Read the reviewed story, availability, price status, finishes, and 3D or custom-scale capabilities for one allowlisted work. Read only.',
    readOnly: true,
    validator: inspectArtworkSchema,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['work_id'],
      properties: { work_id: workIdJson },
    },
  },
  {
    name: 'present_artwork',
    title: 'Present an artwork in the Collector’s Room',
    description: 'Visibly focus one allowlisted work and optionally load its reviewed web-3D model. This reversible page change never launches native AR.',
    readOnly: false,
    validator: presentArtworkSchema,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['work_id', 'open_3d', 'expected_revision'],
      properties: { work_id: workIdJson, open_3d: { type: 'boolean' }, expected_revision: expectedRevisionJson },
    },
  },
  {
    name: 'configure_artwork',
    title: 'Configure a Mini or custom-scale study',
    description: 'Visibly configure a reviewed Mini or an eligible 6–60 inch custom-scale planning study. Finish and signed-base selections are preferences pending studio confirmation.',
    readOnly: false,
    validator: configureArtworkSchema,
    inputSchema: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['mode', 'work_id', 'finish_id', 'quantity', 'signed_base', 'fulfillment', 'expected_revision'],
          properties: {
            mode: { const: 'mini' }, work_id: workIdJson, finish_id: finishIdJson,
            quantity: { type: 'integer', minimum: 1, maximum: 5 }, signed_base: { type: 'boolean' },
            fulfillment: { type: 'string', enum: ['pickup_new_orleans', 'delivery_quote'] },
            expected_revision: expectedRevisionJson,
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['mode', 'work_id', 'finish_id', 'requested_height_in', 'expected_revision'],
          properties: {
            mode: { const: 'custom_scale' }, work_id: workIdJson, finish_id: finishIdJson,
            requested_height_in: { type: 'number', minimum: 6, maximum: 60, multipleOf: 0.5 },
            expected_revision: expectedRevisionJson,
          },
        },
      ],
    },
  },
  {
    name: 'prepare_custom_quote',
    title: 'Prepare a custom-scale quote review',
    description: 'Open a visible, 15-minute, planning-only quote review for the current custom configuration. It does not collect PII, submit an inquiry, or create an order.',
    readOnly: false,
    validator: prepareCustomQuoteSchema,
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['expected_revision'],
      properties: { expected_revision: expectedRevisionJson },
    },
  },
  {
    name: 'prepare_checkout',
    title: 'Prepare an exact Mini checkout review',
    description: 'Open a visible 10-minute checkout review for the current Mini configuration. It creates no payment; the result instructs the agent to request explicit user confirmation before calling the review boundary.',
    readOnly: false,
    validator: prepareCheckoutSchema,
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['expected_revision'],
      properties: { expected_revision: expectedRevisionJson },
    },
  },
  {
    name: 'open_square_checkout',
    title: 'Validate the reviewed checkout boundary',
    description: 'Use only after explicit user instruction to validate the exact unexpired review at the public review-only boundary. This demo never contacts Square, navigates externally, or creates a payment.',
    readOnly: false,
    validator: openSquareCheckoutSchema,
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['review_id', 'expected_revision'],
      properties: { review_id: { type: 'string', format: 'uuid' }, expected_revision: expectedRevisionJson },
    },
  },
] as const;
