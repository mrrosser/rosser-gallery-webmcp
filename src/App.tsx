import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { FINISHES, getArtwork, getFinish } from './core/catalog';
import { collectorRoomService } from './core/service';
import type { WorkId } from './core/types';
import { registerCollectorRoomTools, type RegistrationResult } from './webmcp/register';
import { ArtworkStage } from './components/ArtworkStage';

const webMcpEnabled = import.meta.env.VITE_PUBLIC_WEBMCP_ENABLED !== 'false';

function money(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function shortTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function ToolStatus({ result }: { result: RegistrationResult }) {
  const copy = {
    registered: `${result.count} site tools ready`,
    already_registered: `${result.count} site tools ready`,
    unsupported: 'Manual experience ready',
    disabled: 'Site tools disabled',
    failed: 'Manual experience ready',
  }[result.status];
  return (
    <span className={`tool-status tool-status-${result.status}`}>
      <span aria-hidden="true" className="status-dot" /> {copy}
    </span>
  );
}

export default function App() {
  const state = useSyncExternalStore(collectorRoomService.subscribe, collectorRoomService.getSnapshot);
  const [registration, setRegistration] = useState<RegistrationResult>({ status: 'unsupported', count: 0 });
  const [intent, setIntent] = useState('A meaningful gift about trust for my sister');
  const [budget, setBudget] = useState('100');
  const [curatedIds, setCuratedIds] = useState<WorkId[]>(['the-braider', 'the-nurturer', 'the-wave']);
  const [mode, setMode] = useState<'mini' | 'custom_scale'>('mini');
  const [finishId, setFinishId] = useState(FINISHES[0]!.id);
  const [quantity, setQuantity] = useState(1);
  const [signedBase, setSignedBase] = useState(true);
  const [fulfillment, setFulfillment] = useState<'pickup_new_orleans' | 'delivery_quote'>('pickup_new_orleans');
  const [height, setHeight] = useState(18);

  useEffect(() => {
    setRegistration(registerCollectorRoomTools(collectorRoomService, { enabled: webMcpEnabled }));
  }, []);

  const selectedArtwork = getArtwork(state.selectedWorkId);
  const selectedFinish = state.configuration ? getFinish(state.configuration.finishId) : null;
  const curatedArtworks = useMemo(
    () => curatedIds.map((id) => getArtwork(id)),
    [curatedIds],
  );

  function curate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const maximumBudget = budget.trim() === '' ? undefined : Number(budget);
    const result = collectorRoomService.searchCollection(
      {
        intent,
        ...(Number.isFinite(maximumBudget) ? { maximum_budget_usd: maximumBudget } : {}),
        availability: 'available_now',
      },
      collectorRoomService.manualContext(),
    );
    const matches = result.data?.matches ?? [];
    setCuratedIds(matches.map((match) => match.work_id as WorkId));
  }

  function present(workId: WorkId, open3d = false) {
    collectorRoomService.presentArtwork(
      { work_id: workId, open_3d: open3d, expected_revision: state.revision },
      collectorRoomService.manualContext(),
    );
  }

  function applyConfiguration() {
    if (mode === 'mini') {
      collectorRoomService.configureArtwork(
        {
          mode: 'mini', work_id: state.selectedWorkId, finish_id: finishId,
          quantity, signed_base: signedBase, fulfillment, expected_revision: state.revision,
        },
        collectorRoomService.manualContext(),
      );
      return;
    }
    collectorRoomService.configureArtwork(
      {
        mode: 'custom_scale', work_id: state.selectedWorkId, finish_id: finishId,
        requested_height_in: height, expected_revision: state.revision,
      },
      collectorRoomService.manualContext(),
    );
  }

  function prepareReview() {
    if (state.configuration?.mode === 'custom_scale') {
      collectorRoomService.prepareCustomQuote(
        { expected_revision: state.revision },
        collectorRoomService.manualContext(),
      );
      return;
    }
    collectorRoomService.prepareCheckout(
      { expected_revision: state.revision },
      collectorRoomService.manualContext(),
    );
  }

  function openCheckoutDemo() {
    if (!state.checkoutReview) return;
    collectorRoomService.openSquareCheckout(
      { review_id: state.checkoutReview.reviewId, expected_revision: state.revision },
      collectorRoomService.manualContext(),
    );
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#main-content" aria-label="Rosser Gallery Collector's Room home">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span><strong>Rosser Gallery</strong><small>Collector’s Room</small></span>
        </a>
        <ToolStatus result={registration} />
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Story → Sculpture → Space → Review</p>
            <h1 id="hero-title">Find the piece that knows what you mean.</h1>
            <p className="hero-lede">
              Describe the feeling. Collector’s Room can curate Marcus Rosser’s work, change the same
              presentation you see, explore a real 3D sculpture, and prepare a safe review—without buying for you.
            </p>
          </div>
          <aside className="guardrail-card" aria-label="Collector safety promise">
            <span className="guardrail-number">01</span>
            <p><strong>You keep the final say.</strong> Agent changes stay visible and reversible. Checkout stops for review.</p>
          </aside>
        </section>

        <section className="curator" aria-labelledby="curator-title">
          <div className="section-heading">
            <p className="eyebrow">Start with meaning</p>
            <h2 id="curator-title">Ask the collection</h2>
          </div>
          <form onSubmit={curate} className="curator-form">
            <div className="field field-wide">
              <label htmlFor="intent">What should the piece express?</label>
              <input
                id="intent"
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                minLength={1}
                maxLength={120}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="budget">Maximum budget</label>
              <div className="currency-input"><span>$</span><input id="budget" inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value)} /></div>
            </div>
            <button className="button button-primary curate-button" type="submit">Curate works</button>
          </form>

          <div className="art-grid" aria-live="polite" aria-label="Curated artworks">
            {curatedArtworks.length === 0 ? (
              <p className="empty-state">No reviewed Mini fits that budget. Try $80 or more.</p>
            ) : curatedArtworks.map((artwork, index) => (
              <article key={artwork.id} className={`art-card ${artwork.id === state.selectedWorkId ? 'art-card-selected' : ''}`}>
                <div className="art-card-index">0{index + 1}</div>
                <p className="eyebrow">{artwork.series}</p>
                <h3>{artwork.title}</h3>
                <p>{artwork.story}</p>
                <div className="art-card-footer">
                  <span>{money(artwork.miniPriceUsd)} Mini</span>
                  <button
                    className="text-button"
                    type="button"
                    aria-pressed={artwork.id === state.selectedWorkId}
                    onClick={() => present(artwork.id)}
                  >
                    Present work <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="room-grid">
          <ArtworkStage
            artwork={selectedArtwork}
            viewMode={state.viewMode}
            onLoad3d={() => present('the-braider', true)}
            onShowStory={() => present(state.selectedWorkId, false)}
          />

          <section className="configuration" aria-labelledby="configure-title">
            <div className="section-heading compact-heading">
              <p className="eyebrow">Configure visibly</p>
              <h2 id="configure-title">Shape the presentation</h2>
            </div>

            <fieldset className="segmented-control">
              <legend>Edition</legend>
              <label><input type="radio" name="mode" checked={mode === 'mini'} onChange={() => setMode('mini')} /><span>6-inch Mini · $80</span></label>
              <label className={!selectedArtwork.customScaleEligible ? 'disabled-option' : ''}>
                <input type="radio" name="mode" checked={mode === 'custom_scale'} disabled={!selectedArtwork.customScaleEligible} onChange={() => setMode('custom_scale')} />
                <span>Custom scale · planning range</span>
              </label>
            </fieldset>

            <fieldset className="finish-options">
              <legend>Finish preference</legend>
              <div className="swatch-grid">
                {FINISHES.map((finish) => (
                  <label key={finish.id} className={finishId === finish.id ? 'swatch-selected' : ''}>
                    <input type="radio" name="finish" value={finish.id} checked={finishId === finish.id} onChange={() => setFinishId(finish.id)} />
                    <span className="swatch" style={{ background: finish.swatch }} aria-hidden="true" />
                    <span>{finish.label}</span>
                  </label>
                ))}
              </div>
              <p className="quiet-note">A preference, not an inventory guarantee. Marcus confirms the production finish.</p>
            </fieldset>

            {mode === 'mini' ? (
              <div className="option-grid">
                <div className="field">
                  <label htmlFor="quantity">Quantity</label>
                  <select id="quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="fulfillment">Fulfillment</label>
                  <select id="fulfillment" value={fulfillment} onChange={(event) => setFulfillment(event.target.value as typeof fulfillment)}>
                    <option value="pickup_new_orleans">New Orleans pickup</option>
                    <option value="delivery_quote">Delivery quote</option>
                  </select>
                </div>
                <label className="check-row"><input type="checkbox" checked={signedBase} onChange={(event) => setSignedBase(event.target.checked)} /><span>Request a signed base</span></label>
              </div>
            ) : (
              <div className="scale-control">
                <label htmlFor="height">Requested height <strong>{height} in</strong></label>
                <input id="height" type="range" min="6" max="60" step="0.5" value={height} onChange={(event) => setHeight(Number(event.target.value))} />
                <div><span>6 in</span><span>60 in</span></div>
              </div>
            )}

            <button className="button button-primary button-full" type="button" onClick={applyConfiguration}>Apply visible configuration</button>

            {state.configuration && (
              <div className="configuration-summary" aria-live="polite">
                <p className="eyebrow">Current configuration</p>
                <h3>{getArtwork(state.configuration.workId).title} · {state.configuration.mode === 'mini' ? 'Mini' : `${state.configuration.requestedHeightIn}-inch study`}</h3>
                <dl>
                  <div><dt>Finish</dt><dd>{selectedFinish?.label}</dd></div>
                  {state.configuration.mode === 'mini' ? (
                    <>
                      <div><dt>Quantity</dt><dd>{state.configuration.quantity}</dd></div>
                      <div><dt>Subtotal</dt><dd>{money(state.configuration.quantity * 80)}</dd></div>
                      <div><dt>Fulfillment</dt><dd>{state.configuration.fulfillment === 'pickup_new_orleans' ? 'New Orleans pickup' : 'Delivery quote'}</dd></div>
                    </>
                  ) : (
                    <div><dt>Planning range</dt><dd>{money(state.configuration.planningLowUsd)}–{money(state.configuration.planningHighUsd)}</dd></div>
                  )}
                </dl>
                <p className="quiet-note">{state.configuration.mode === 'mini' ? 'Finish and signed-base requests are confirmed by the studio.' : 'Nonbinding planning range. Final fabrication and delivery are quoted in writing.'}</p>
                <button className="button button-secondary button-full" type="button" onClick={prepareReview}>
                  {state.configuration.mode === 'mini' ? 'Prepare checkout review' : 'Prepare quote review'}
                </button>
              </div>
            )}
          </section>
        </div>

        {(state.quoteReview || state.checkoutReview) && (
          <section className="review" aria-labelledby="review-title">
            <div>
              <p className="eyebrow">Human checkpoint</p>
              <h2 id="review-title">Review before anything leaves the room.</h2>
              <p>{state.quoteReview ? 'This planning draft is not an inquiry and contains no contact information.' : 'This is an exact product review, not a payment. The standalone challenge app stops before Square.'}</p>
            </div>
            <div className="review-sheet">
              {state.quoteReview ? (
                <>
                  <span className="review-kind">Custom-scale planning review</span>
                  <strong>{getArtwork(state.quoteReview.configuration.workId).title} · {state.quoteReview.configuration.requestedHeightIn} inches</strong>
                  <span>{getFinish(state.quoteReview.configuration.finishId).label}</span>
                  <span>{money(state.quoteReview.configuration.planningLowUsd)}–{money(state.quoteReview.configuration.planningHighUsd)}</span>
                  <small>Expires at {shortTime(state.quoteReview.expiresAt)} · Not submitted</small>
                </>
              ) : state.checkoutReview && (
                <>
                  <span className="review-kind">Exact Mini review</span>
                  <strong>{getArtwork(state.checkoutReview.configuration.workId).title} · {state.checkoutReview.configuration.quantity} × Mini</strong>
                  <span>{getFinish(state.checkoutReview.configuration.finishId).label} · {state.checkoutReview.configuration.fulfillment === 'pickup_new_orleans' ? 'New Orleans pickup' : 'Delivery quote'}</span>
                  <span>Total {money(state.checkoutReview.totalUsd)}</span>
                  <small>Expires at {shortTime(state.checkoutReview.expiresAt)} · Confirmation required</small>
                  <button className="button button-primary button-full" type="button" onClick={openCheckoutDemo}>Confirm handoff (review-only demo)</button>
                </>
              )}
            </div>
          </section>
        )}

        <section className="activity" aria-labelledby="activity-title">
          <div className="activity-heading">
            <div><p className="eyebrow">Shared state · revision {state.revision}</p><h2 id="activity-title">What changed</h2></div>
            <button className="button button-secondary" type="button" disabled={!state.canUndo} onClick={() => collectorRoomService.undo()}>Undo latest change</button>
          </div>
          <p className="status-message" role="status" aria-live="polite">{state.statusMessage}</p>
          {state.activity.length ? (
            <ol className="activity-list">
              {state.activity.map((entry) => (
                <li key={entry.id}><span className={`source-badge source-${entry.source}`}>{entry.source === 'webmcp' ? 'Agent' : 'You'}</span><span>{entry.label}</span><time dateTime={entry.createdAt}>{shortTime(entry.createdAt)}</time></li>
              ))}
            </ol>
          ) : <p className="empty-state">Visible manual and agent changes will appear here.</p>}
        </section>
      </main>

      <footer className="site-footer">
        <p>Collector’s Room · A Rosser Gallery × RT Solutions WebMCP challenge build</p>
        <p>Art by Marcus Rosser · Challenge media © RT Solutions · Code licensed MIT · No purchase is completed in this standalone demo.</p>
      </footer>
    </>
  );
}
