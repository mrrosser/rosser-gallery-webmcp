import { expect, test, type Page } from '@playwright/test';

interface BrowserTool {
  name: string;
  annotations: Record<string, boolean>;
  execute: (input: unknown) => Promise<Record<string, unknown>>;
}

async function installWebMcpShim(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tools: BrowserTool[] = [];
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(tool: BrowserTool) {
          tools.push(tool);
        },
      },
    });
    Object.defineProperty(window, '__COLLECTOR_ROOM_TOOLS__', {
      configurable: true,
      value: tools,
    });
  });
}

async function executeTool(page: Page, name: string, input: unknown): Promise<Record<string, unknown>> {
  return page.evaluate(async ({ toolName, toolInput }) => {
    const tools = (window as unknown as { __COLLECTOR_ROOM_TOOLS__: BrowserTool[] }).__COLLECTOR_ROOM_TOOLS__;
    const tool = tools.find(({ name: candidate }) => candidate === toolName);
    if (!tool) throw new Error(`Missing browser tool: ${toolName}`);
    return tool.execute(toolInput);
  }, { toolName: name, toolInput: input });
}

test('registers one seven-tool surface and keeps the full flow visible and review-only', async ({ page }) => {
  const nonLocalRequests: string[] = [];
  const modelRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') nonLocalRequests.push(request.url());
    if (url.pathname.endsWith('.glb')) modelRequests.push(url.pathname);
  });
  await installWebMcpShim(page);
  await page.goto('/');

  await expect(page.getByText('7 site tools ready')).toBeVisible();
  const registered = await page.evaluate(() => (
    (window as unknown as { __COLLECTOR_ROOM_TOOLS__: BrowserTool[] }).__COLLECTOR_ROOM_TOOLS__
      .map(({ name, annotations }) => ({ name, annotationKeys: Object.keys(annotations), readOnly: annotations.readOnlyHint }))
  ));
  expect(registered).toEqual([
    { name: 'search_collection', annotationKeys: ['readOnlyHint'], readOnly: true },
    { name: 'inspect_artwork', annotationKeys: ['readOnlyHint'], readOnly: true },
    { name: 'present_artwork', annotationKeys: ['readOnlyHint'], readOnly: false },
    { name: 'configure_artwork', annotationKeys: ['readOnlyHint'], readOnly: false },
    { name: 'prepare_custom_quote', annotationKeys: ['readOnlyHint'], readOnly: false },
    { name: 'prepare_checkout', annotationKeys: ['readOnlyHint'], readOnly: false },
    { name: 'open_square_checkout', annotationKeys: ['readOnlyHint'], readOnly: false },
  ]);

  const search = await executeTool(page, 'search_collection', {
    intent: 'A gift about trust for my sister',
    maximum_budget_usd: 100,
    availability: 'available_now',
  });
  expect(search).toMatchObject({ status: 'ok', code: 'collection_curated', state_revision: 1 });
  expect(((search.data as { matches: Array<{ work_id: string }> }).matches)[0]?.work_id).toBe('the-braider');

  const presented = await executeTool(page, 'present_artwork', {
    work_id: 'the-braider',
    open_3d: true,
    expected_revision: 1,
  });
  expect(presented).toMatchObject({ status: 'ok', state_revision: 2 });
  await page.waitForFunction(() => Boolean((document.querySelector('model-viewer') as HTMLElement & { loaded?: boolean } | null)?.loaded));
  expect(modelRequests).toEqual(['/models/the-braider/the-braider-6in.glb']);

  const configured = await executeTool(page, 'configure_artwork', {
    mode: 'mini',
    work_id: 'the-braider',
    finish_id: 'pla-basic-black',
    quantity: 1,
    signed_base: true,
    fulfillment: 'pickup_new_orleans',
    expected_revision: 2,
  });
  expect(configured).toMatchObject({ status: 'ok', code: 'artwork_configured', state_revision: 3 });
  await expect(page.getByText('Current configuration')).toBeVisible();
  await expect(page.getByText('Subtotal').locator('..')).toContainText('$80');

  const prepared = await executeTool(page, 'prepare_checkout', { expected_revision: 3 });
  expect(prepared).toMatchObject({ status: 'ok', code: 'checkout_review_prepared', state_revision: 4 });
  const reviewId = (prepared.data as { review_id: string }).review_id;
  await expect(page.getByText('Exact Mini review', { exact: true })).toBeVisible();
  await expect(page.getByText('Total $80')).toBeVisible();

  const opened = await executeTool(page, 'open_square_checkout', {
    review_id: reviewId,
    expected_revision: 4,
  });
  expect(opened).toMatchObject({
    status: 'ok',
    code: 'checkout_handoff_mocked',
    state_revision: 5,
    data: { handoff_mode: 'review_only', payment_created: false, external_navigation: false },
  });
  await expect(page.locator('.status-message')).toContainText('Review-only demo');
  await expect(page.getByText('Agent', { exact: true }).first()).toBeVisible();
  expect(page.url()).toBe('http://127.0.0.1:4173/');
  expect(nonLocalRequests).toEqual([]);

  await page.getByRole('button', { name: 'Undo latest change' }).click();
  await expect(page.getByText('Shared state · revision 6')).toBeVisible();
  await expect(page.locator('.status-message')).toContainText('Nothing has been purchased');
  await expect(page.getByText('Exact Mini review', { exact: true })).toBeVisible();
  expect(nonLocalRequests).toEqual([]);
});

test('fits a 390px mobile viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installWebMcpShim(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /find the piece/i })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole('button', { name: /apply visible configuration/i })).toBeVisible();
});
