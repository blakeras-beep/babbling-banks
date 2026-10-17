import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getEpisodesForShow, getShow } from '../data/index.js';
import { searchEpisodes, getHighlightTerms } from '../lib/search.js';
import { formatDuration, formatEpisodeCode, getDisplayTitle } from '../lib/platforms.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import EpisodeCard from '../components/EpisodeCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import NotFoundPage from './NotFoundPage.jsx';

/** Horizontal tab strip that shows a fade while more tabs are off-screen. */
function SeasonTabs({ seasons, season, onSelect }) {
  const ref = useRef(null);
  const [moreRight, setMoreRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setMoreRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [seasons]);

  return (
    <div className={`season-tabs-wrap ${moreRight ? 'has-more' : ''}`}>
      <div className="season-tabs" role="tablist" aria-label="Seasons" ref={ref}>
        <button
          type="button"
          role="tab"
          aria-selected={season === 'all'}
          className={`chip chip--small ${season === 'all' ? 'chip--active' : ''}`}
          onClick={() => onSelect('all')}
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
            onClick={() => onSelect(String(number))}
          >
            Season {number}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ShowPage() {
  const { showId } = useParams();
  const show = getShow(showId);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilter = searchParams.get('q') ?? '';
  const [season, setSeason] = useState('all');
  const [filter, setFilter] = useState(urlFilter);
  useDocumentTitle(show?.name ?? 'Show not found');

  // Keep the in-show search in the URL so episode-page pills can link here
  // and the back button restores it.
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = filter.trim();
      if (trimmed === urlFilter) return;
      setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [filter, urlFilter, setSearchParams]);

  useEffect(() => {
    setFilter((current) => (current.trim() === urlFilter ? current : urlFilter));
  }, [urlFilter]);

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
                {searchResults.length} match{searchResults.length === 1 ? '' : 'es'} for “
                {trimmedFilter}”
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
            <SeasonTabs seasons={seasons} season={season} onSelect={setSeason} />
          )}
          <div className="stack" style={{ gap: 8, marginTop: seasons.length > 1 ? 0 : 18 }}>
            {listed.map((episode) => {
              const songs = show.isYouTube ? (episode.songs ?? []).slice(0, 3) : [];
              const code = show.isYouTube
                ? (formatDuration(episode.duration) ?? 'Video')
                : formatEpisodeCode(episode);
              return (
                <Link key={episode.id} to={`/episode/${episode.id}`} className="episode-row">
                  <span
                    className={`episode-row__code ${show.isYouTube ? 'episode-row__code--wide' : ''}`}
                  >
                    {code}
                  </span>
                  <span className="episode-row__main">
                    <span className="episode-row__title">{getDisplayTitle(episode)}</span>
                    {songs.length > 0 && (
                      <span className="episode-row__sub">
                        {songs.map((song) => song.title).join(' · ')}
                        {episode.songs.length > songs.length &&
                          ` · +${episode.songs.length - songs.length} more`}
                      </span>
                    )}
                  </span>
                  <span className="episode-row__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
