import { useEffect, useState } from 'react';
import type { Artwork } from '../core/catalog';

interface ArtworkStageProps {
  artwork: Artwork;
  viewMode: 'poster' | '3d';
  onLoad3d: () => void;
  onShowStory: () => void;
}

export function ArtworkStage({ artwork, viewMode, onLoad3d, onShowStory }: ArtworkStageProps) {
  const isBraider = artwork.id === 'the-braider';
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerFailed, setViewerFailed] = useState(false);

  useEffect(() => {
    if (!isBraider || viewMode !== '3d' || viewerReady || viewerFailed) return;
    let active = true;
    void import('@google/model-viewer')
      .then(() => { if (active) setViewerReady(true); })
      .catch(() => { if (active) setViewerFailed(true); });
    return () => { active = false; };
  }, [isBraider, viewMode, viewerReady, viewerFailed]);

  return (
    <section className="art-stage" aria-labelledby="stage-title">
      <div className="stage-heading">
        <div>
          <p className="eyebrow">Now presenting</p>
          <h2 id="stage-title">{artwork.title}</h2>
        </div>
        <span className="edition-chip">Relationship Lessons</span>
      </div>

      <div className="model-frame">
        {isBraider && viewMode === '3d' && viewerReady && !viewerFailed ? (
          <model-viewer
            src="/models/the-braider/the-braider-6in.glb"
            poster="/models/the-braider/the-braider-6in-poster.jpg"
            ios-src="/models/the-braider/the-braider-6in.usdz"
            alt="A rotatable three-dimensional model of The Braider sculpture by Marcus Rosser"
            camera-controls
            ar
            ar-modes="webxr scene-viewer quick-look"
            touch-action="pan-y"
            shadow-intensity="1"
            environment-image="neutral"
            loading="lazy"
            reveal="interaction"
            onError={() => setViewerFailed(true)}
          >
            <button className="ar-button" slot="ar-button" type="button">
              View in your space
            </button>
            <p className="model-progress" slot="progress-bar">Loading the reviewed model…</p>
          </model-viewer>
        ) : isBraider ? (
          <>
          <img
            src="/models/the-braider/the-braider-6in-poster.jpg"
            alt="The Braider sculpture by Marcus Rosser, shown in a studio rendering"
            width="1200"
            height="1200"
          />
          {viewMode === '3d' && (
            <p className="fallback-message" role="status">
              {viewerFailed ? 'Interactive 3D is unavailable; the reviewed poster remains visible.' : 'Preparing the interactive 3D viewer…'}
            </p>
          )}
          </>
        ) : (
          <div className={`story-object story-object-${artwork.id}`} aria-hidden="true">
            <span>{artwork.title.slice(0, 1)}</span>
          </div>
        )}
        <p className="asset-credit">{isBraider ? 'The Braider by Marcus Rosser · media © RT Solutions' : `${artwork.title} · Marcus Rosser`}</p>
      </div>

      <p className="art-story">{artwork.story}</p>
      <div className="stage-actions" aria-label="Presentation controls">
        {isBraider && viewMode === 'poster' && (
          <button className="button button-primary" type="button" onClick={onLoad3d}>
            Load interactive 3D
          </button>
        )}
        {viewMode === '3d' && (
          <button className="button button-secondary" type="button" onClick={onShowStory}>
            Return to poster
          </button>
        )}
        {!isBraider && <span className="quiet-note">This challenge preview uses a story card for this work.</span>}
      </div>
      {viewMode === '3d' && !viewerFailed && (
        <p className="quiet-note">
          Drag to rotate and pinch or scroll to zoom. Native AR opens only from your direct button click.
        </p>
      )}
    </section>
  );
}
