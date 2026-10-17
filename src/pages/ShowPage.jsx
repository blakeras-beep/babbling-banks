import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEpisodesForShow, getShow } from '../data/index.js';
import { searchEpisodes } from '../lib/search.js';
import { formatEpisodeCode } from '../lib/platforms.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useArtCredit } from '../lib/CreditContext.jsx';
import SearchField from '../components/SearchField.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { CrayonDivider, ResultRows } from '../components/ResultRow.jsx';
import NotFoundPage from './NotFoundPage.jsx';

/** One show, grouped by season, with an in-show search. Not in the kit; built from its parts. */
export default function ShowPage() {
  const { showId } = useParams();
  const show = getShow(showId);
  const [season, setSeason] = useState('all');
  const [filter, setFilter] = useState('');
  useDocumentTitle(show?.name ?? 'Show not found');
  useArtCredit('several');

  const episodes = useMemo(() => getEpisodesForShow(showId), [showId]);
  const seasons = useMemo(
    () => [...new Set(episodes.map((e) => e.season))].sort((a, b) => a - b),
    [episodes]
  );

  if (!show) return <NotFoundPage message="That show wandered off. Happens to the best of us." />;

  const trimmedFilter = filter.trim();
  const searchResults = trimmedFilter
    ? searchEpisodes(trimmedFilter, { show: showId, limit: 30 })
    : null;
  const listed = season === 'all' ? episodes : episodes.filter((e) => e.season === Number(season));

  return (
    <div className="col">
      <div className="tape tape--headline headline-strip headline-strip--plain">
        <h1 className="headline-strip__text">{show.name}</h1>
      </div>
      <p className="lead">{show.description}.</p>
      <p className="notice notice--muted">
        {episodes.length} {show.isYouTube ? 'videos' : 'episodes'}
        {!show.isYouTube && seasons.length > 1 ? ` · ${seasons.length} seasons` : ''}
        {show.ageRange ? ` · ages ${show.ageRange}` : ''}
        {show.episodeLength ? ` · ${show.episodeLength}` : ''}
        {' · '}
        {show.platformUrl ? (
          <a href={show.platformUrl} target="_blank" rel="noopener noreferrer">
            on {show.platform}
          </a>
        ) : (
          `on ${show.platform}`
        )}
      </p>

      <SearchField
        id="show-filter"
        value={filter}
        onChange={setFilter}
        label={`Search within ${show.name}`}
        placeholder={`in ${show.name}`}
      />

      {searchResults ? (
        searchResults.length === 0 ? (
          <EmptyState title="That one stumped us.">
            <p className="body-text">Try different words, or clear the search.</p>
          </EmptyState>
        ) : (
          <section style={{ marginTop: 8 }}>
            <h2 className="section-label">or maybe…</h2>
            <ResultRows episodes={searchResults.map((r) => r.episode)} query={trimmedFilter} />
          </section>
        )
      ) : (
        <>
          {seasons.length > 1 && (
            <div className="season-tabs" role="tablist" aria-label="Seasons">
              <button
                type="button"
                role="tab"
                aria-selected={season === 'all'}
                className="example-link"
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
                  className="example-link"
                  onClick={() => setSeason(String(number))}
                >
                  Season {number}
                </button>
              ))}
            </div>
          )}
          <div className="rows" style={{ marginTop: 8 }}>
            {listed.map((episode, index) => (
              <div key={episode.id}>
                {index > 0 && <CrayonDivider />}
                <Link to={`/episode/${episode.id}`} className="row row__main">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="row__title">{episode.title}</span>
                    <span className="row__caption">
                      <span className="code">{formatEpisodeCode(episode)}</span>
                    </span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
