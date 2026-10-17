import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getEpisode, getEpisodesForShow, getShow } from '../data/index.js';
import { getRelatedEpisodes, searchEpisodes } from '../lib/search.js';
import { getMatchedWords } from '../lib/matchedWords.js';
import { getWatchUrl } from '../lib/platforms.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useArtCredit } from '../lib/CreditContext.jsx';
import { pieceFor } from '../lib/art.js';
import ArtBand from '../components/ArtBand.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import QuoteStrip from '../components/QuoteStrip.jsx';
import { CaptionRow, Thumbnail } from '../components/ResultCard.jsx';
import { CrayonDivider, ResultRows } from '../components/ResultRow.jsx';
import Icon from '../components/Icon.jsx';
import NotFoundPage from './NotFoundPage.jsx';

const PIECE = pieceFor('episode-detail');

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
    const text = `${episode.title}. Decoded with Babbling Banks.`;
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
    <button type="button" className="text-action" onClick={share} aria-live="polite">
      <Icon name="shareNetwork" />
      {copied ? 'Link copied' : 'Share the decode'}
    </button>
  );
}

export default function EpisodePage() {
  const { id } = useParams();
  const location = useLocation();
  const episode = getEpisode(id);
  const show = episode ? getShow(episode.show) : null;
  useDocumentTitle(episode ? `${episode.title} · ${show?.name ?? ''}` : 'Episode not found');
  useArtCredit(episode ? PIECE?.id : null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  if (!episode)
    return <NotFoundPage message="That episode wandered off. Happens to the best of us." />;

  const saidQuery = location.state?.q ?? '';
  // Re-run the search so the swipes land on the same words as the results screen.
  const saidResult = saidQuery
    ? searchEpisodes(saidQuery, { limit: 24 }).find((r) => r.episode.id === episode.id)
    : null;
  const matched = saidResult ? getMatchedWords(saidQuery, saidResult) : [];
  const siblings = getEpisodesForShow(episode.show);
  const position = siblings.findIndex((item) => item.id === episode.id);
  const previous = position > 0 ? siblings[position - 1] : null;
  const next = position < siblings.length - 1 ? siblings[position + 1] : null;
  const related = getRelatedEpisodes(episode, 4);
  const watchUrl = getWatchUrl(episode, show);
  const isAiGenerated = /ai generated/i.test(episode.source ?? '');

  return (
    <div className="detail">
      <ArtBand pieceId={PIECE?.id} height={120} />
      <div className="col">
        <article className="tape tape--card detail-card">
          <h1 className="result-card__title">{episode.title}</h1>
          <CaptionRow episode={episode} showLink />
          <Thumbnail episode={episode} />
        </article>

        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary detail__play"
          >
            Play this one
          </a>
        )}

        <p className="description">{episode.fullSynopsis || episode.shortDescription}</p>

        <div className="actions">
          <FavoriteButton episode={episode} labelled />
          <ShareButton episode={episode} />
        </div>

        {episode.characters?.length > 0 && (
          <section>
            <h2 className="section-label">who&apos;s in it</h2>
            <ul className="examples">
              {episode.characters.map((name) => (
                <li key={name}>
                  <Link to={`/?q=${encodeURIComponent(name)}`} className="example-link">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {episode.settings?.length > 0 && (
          <section>
            <h2 className="section-label">where it happens</h2>
            <ul className="examples">
              {episode.settings.map((name) => (
                <li key={name}>
                  <span className="example-link" style={{ color: 'var(--color-text)' }}>
                    {name}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {episode.themes?.length > 0 && (
          <section>
            <h2 className="section-label">what it&apos;s about</h2>
            <ul className="examples">
              {episode.themes.map((name) => (
                <li key={name}>
                  <Link to={`/?q=${encodeURIComponent(name)}`} className="example-link">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {episode.songs?.length > 0 && (
          <section>
            <h2 className="section-label">songs in this one</h2>
            <ol className="songs">
              {episode.songs.map((song, index) => {
                const url = songUrl(episode, song);
                const inner = (
                  <>
                    <span className="song__name">{song.title}</span>
                    {song.timestamp && (
                      <span className="song__time">
                        <span className="visually-hidden">at </span>
                        {song.timestamp}
                      </span>
                    )}
                  </>
                );
                const key = `${song.title}-${song.timestamp}`;
                return (
                  <li key={key}>
                    {index > 0 && <CrayonDivider />}
                    {url ? (
                      <a className="song" href={url} target="_blank" rel="noopener noreferrer">
                        {inner}
                      </a>
                    ) : (
                      <div className="song">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {saidQuery && (
          <section>
            <h2 className="section-label">what they said</h2>
            <QuoteStrip text={saidQuery} matched={matched} />
          </section>
        )}

        <p className="source-note">
          {isAiGenerated
            ? 'These episode details were written with AI from public descriptions and may not be exact. '
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

        {(previous || next) && (
          <nav className="pager" aria-label="Episode order">
            {previous && (
              <Link to={`/episode/${previous.id}`} className="text-action">
                <Icon name="caretLeft" />
                {previous.title}
              </Link>
            )}
            {next && (
              <Link to={`/episode/${next.id}`} className="text-action text-action--next">
                {next.title}
                <Icon name="caretRight" />
              </Link>
            )}
          </nav>
        )}

        {related.length > 0 && (
          <section>
            <h2 className="section-label">or maybe…</h2>
            <ResultRows episodes={related} />
          </section>
        )}
      </div>
    </div>
  );
}
