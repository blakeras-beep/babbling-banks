import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEpisodesForShow, getShow } from '../data/index.js';
import { searchEpisodes, getHighlightTerms } from '../lib/search.js';
import { formatEpisodeCode } from '../lib/platforms.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import EpisodeCard from '../components/EpisodeCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import NotFoundPage from './NotFoundPage.jsx';

export default function ShowPage() {
  const { showId } = useParams();
  const show = getShow(showId);
  const [season, setSeason] = useState('all');
  const [filter, setFilter] = useState('');
  useDocumentTitle(show?.name ?? 'Show not found');

  const episodes = useMemo(() => getEpisodesForShow(showId), [showId]);
  const seasons = useMemo(
    () => [...new Set(episodes.map((e) => e.season))].sort((a, b) => a - b),
    [episodes]
  );

  if (!show) return <NotFoundPage message="We couldn't find that show." />;

  const trimmedFilter = filter.trim();
  const searchResults = trimmedFilter
    ? searchEpisodes(trimmedFilter, { show: showId, limit: 30 })
    : null;
  const listed = season === 'all' ? episodes : episodes.filter((e) => e.season === Number(season));
  const highlightTerms = getHighlightTerms(trimmedFilter);

  return (
    <div className="container" style={{ '--show-color': show.color }}>
      <section className="show-hero">
        <div className="show-hero__emoji" aria-hidden="true">
          {show.emoji}
        </div>
        <div>
          <h1 className="show-hero__title">{show.name}</h1>
          <p className="show-hero__description">{show.description}</p>
          <div className="show-hero__facts">
            <span className="fact">
              {episodes.length} {show.isYouTube ? 'videos' : 'episodes'}
            </span>
            {!show.isYouTube && seasons.length > 1 && (
              <span className="fact">{seasons.length} seasons</span>
            )}
            {show.ageRange && <span className="fact">Ages {show.ageRange}</span>}
            {show.episodeLength && <span className="fact">{show.episodeLength}</span>}
            <span className="fact">
              {show.platformUrl ? (
                <a
                  href={show.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit' }}
                >
                  Watch on {show.platform} ↗
                </a>
              ) : (
                `On ${show.platform}`
              )}
            </span>
          </div>
        </div>
      </section>

      <div style={{ marginTop: 20 }}>
        <label htmlFor="show-filter" className="visually-hidden">
          Search within {show.name}
        </label>
        <div className="search-box" style={{ boxShadow: 'none' }}>
          <span className="search-box__icon" aria-hidden="true">
            🔍
          </span>
          <input
            id="show-filter"
            className="search-box__input"
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={`Search within ${show.name}…`}
            autoComplete="off"
          />
          {filter && (
            <button
              type="button"
              className="search-box__clear"
              onClick={() => setFilter('')}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {searchResults ? (
        <div style={{ marginTop: 18 }}>
          {searchResults.length === 0 ? (
            <EmptyState title={`Nothing in ${show.name} matches that`}>
              Try different words or clear the search.
            </EmptyState>
          ) : (
            <div className="stack">
              <div className="results-count">
                {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
              </div>
              {searchResults.map((result, index) => (
                <EpisodeCard
                  key={result.episode.id}
                  episode={result.episode}
                  matches={result.matches}
                  highlightTerms={highlightTerms}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {seasons.length > 1 && (
            <div className="season-tabs" role="tablist" aria-label="Seasons">
              <button
                type="button"
                role="tab"
                aria-selected={season === 'all'}
                className={`chip chip--small ${season === 'all' ? 'chip--active' : ''}`}
                onClick={() => setSeason('all')}
              >
                All
              </button>
              {seasons.map((number) => (
                <button
                  type="button"
                  role="tab"
                  key={number}
                  aria-selected={season === String(number)}
                  className={`chip chip--small ${season === String(number) ? 'chip--active' : ''}`}
                  onClick={() => setSeason(String(number))}
                >
                  Season {number}
                </button>
              ))}
            </div>
          )}
          <div className="stack" style={{ gap: 8, marginTop: seasons.length > 1 ? 0 : 18 }}>
            {listed.map((episode) => (
              <Link key={episode.id} to={`/episode/${episode.id}`} className="episode-row">
                <span className="episode-row__code">{formatEpisodeCode(episode)}</span>
                <span className="episode-row__title">{episode.title}</span>
                <span className="episode-row__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
