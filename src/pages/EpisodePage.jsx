import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getEpisode, getEpisodesForShow, getShow } from '../data/index.js';
import { getRelatedEpisodes } from '../lib/search.js';
import {
  formatDuration,
  formatEpisodeCode,
  getDisplayTitle,
  getPlatformColor,
  getWatchUrl,
} from '../lib/platforms.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import FavoriteButton from '../components/FavoriteButton.jsx';
import EpisodeCard from '../components/EpisodeCard.jsx';
import NotFoundPage from './NotFoundPage.jsx';

const timestampToSeconds = (timestamp) =>
  timestamp
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);

function songUrl(episode, song) {
  if (!episode.videoId || !song.timestamp) return null;
  return `https://www.youtube.com/watch?v=${episode.videoId}&t=${timestampToSeconds(song.timestamp)}s`;
}

function ShareButton({ episode }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    const text = `${episode.title} — found with Babbling Banks`;
    try {
      if (navigator.share) {
        await navigator.share({ title: episode.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user cancelled or clipboard blocked; nothing to do
    }
  };
  return (
    <button type="button" className="btn btn--secondary" onClick={share} aria-live="polite">
      <span aria-hidden="true">{copied ? '✅' : '🔗'}</span> {copied ? 'Link copied' : 'Share'}
    </button>
  );
}

export default function EpisodePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const episode = getEpisode(id);
  const show = episode ? getShow(episode.show) : null;
  useDocumentTitle(episode ? `${episode.title} · ${show?.name ?? ''}` : 'Episode not found');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  if (!episode) return <NotFoundPage message="We couldn't find that episode." />;

  const siblings = getEpisodesForShow(episode.show);
  const position = siblings.findIndex((item) => item.id === episode.id);
  const previous = position > 0 ? siblings[position - 1] : null;
  const next = position < siblings.length - 1 ? siblings[position + 1] : null;
  const related = getRelatedEpisodes(episode, 4);
  const watchUrl = getWatchUrl(episode, show);
  const isAiGenerated = /ai generated/i.test(episode.source ?? '');

  return (
    <div className="container" style={{ '--show-color': show?.color ?? 'var(--bb-primary)' }}>
      <div className="detail-toolbar">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        >
          ← Back
        </button>
        <div className="detail-toolbar__actions">
          <ShareButton episode={episode} />
          <FavoriteButton episode={episode} labelled />
        </div>
      </div>

      <article className="detail-card">
        <div className="detail-card__banner">
          <span className="detail-card__banner-emoji" aria-hidden="true">
            {show?.emoji}
          </span>
          <div>
            <Link to={`/show/${episode.show}`} className="detail-card__show">
              {show?.name ?? episode.show}
            </Link>
            <div className="detail-card__code">
              {formatEpisodeCode(episode, { long: true })}
              {episode.duration ? ` • ${formatDuration(episode.duration)}` : ''}
            </div>
          </div>
        </div>
        <div className="detail-card__body">
          <h1 className="detail-card__title">{getDisplayTitle(episode)}</h1>
          {episode.shortTitle && <p className="detail-card__alt-title">{episode.title}</p>}
          <p className="detail-card__synopsis">
            {episode.fullSynopsis || episode.shortDescription}
          </p>

          {episode.characters?.length > 0 && (
            <section className="detail-section">
              <h2 className="section-label">Characters</h2>
              <div className="pill-row">
                {episode.characters.map((name) => (
                  <Link
                    key={name}
                    to={`/show/${episode.show}?q=${encodeURIComponent(name)}`}
                    className="pill pill--primary"
                    title={`More ${show?.name ?? ''} episodes with ${name}`}
                    aria-label={`${name}: more ${show?.name ?? ''} episodes with ${name}`}
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {episode.settings?.length > 0 && (
            <section className="detail-section">
              <h2 className="section-label">Where it happens</h2>
              <div className="pill-row">
                {episode.settings.map((name) => (
                  <span key={name} className="pill">
                    📍 {name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {episode.themes?.length > 0 && (
            <section className="detail-section">
              <h2 className="section-label">Themes</h2>
              <div className="pill-row">
                {episode.themes.map((name) => (
                  <Link
                    key={name}
                    to={`/show/${episode.show}?q=${encodeURIComponent(name)}`}
                    className="pill"
                    title={`More ${show?.name ?? ''} episodes about ${name.toLowerCase()}`}
                    aria-label={`${name}: more ${show?.name ?? ''} episodes about ${name.toLowerCase()}`}
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {episode.songs?.length > 0 && (
            <section className="detail-section">
              <h2 className="section-label">🎵 Songs in this video</h2>
              <div className="song-list">
                {episode.songs.map((song) => {
                  const url = songUrl(episode, song);
                  const inner = (
                    <>
                      <span>{song.title}</span>
                      <span className="song-list__time">{song.timestamp}</span>
                    </>
                  );
                  return url ? (
                    <a
                      key={`${song.title}-${song.timestamp}`}
                      className="song-list__item"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={`${song.title}-${song.timestamp}`} className="song-list__item">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--watch btn--block"
              style={{ backgroundColor: getPlatformColor(episode.platform) ?? 'var(--bb-primary)' }}
            >
              <span aria-hidden="true">{episode.platform === 'YouTube' ? '▶️' : '📺'}</span> Watch
              on {episode.platform}
            </a>
          )}

          <p className="source-note">
            {isAiGenerated
              ? 'These episode details were generated with AI from public descriptions and may not be exact. '
              : `Source: ${episode.source}. `}
            Spotted a mistake?{' '}
            <a
              href="https://github.com/blakeras-beep/babbling-banks/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Let us know
            </a>
            .
          </p>
        </div>
      </article>

      {(previous || next) && (
        <div className="detail-toolbar" style={{ marginTop: 14 }}>
          {previous ? (
            <Link to={`/episode/${previous.id}`} className="btn btn--ghost">
              ← {getDisplayTitle(previous)}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/episode/${next.id}`} className="btn btn--ghost">
              {getDisplayTitle(next)} →
            </Link>
          )}
        </div>
      )}

      {related.length > 0 && (
        <section className="related">
          <h2 className="related__title">You might also like</h2>
          <div className="stack">
            {related.map((item, index) => (
              <EpisodeCard key={item.id} episode={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
