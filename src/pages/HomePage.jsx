import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchEpisodes, generateFollowUps, getHighlightTerms } from '../lib/search.js';
import { getShowName } from '../data/index.js';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '../lib/storage.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import SearchBox from '../components/SearchBox.jsx';
import EpisodeCard from '../components/EpisodeCard.jsx';
import FollowUpQuestions from '../components/FollowUpQuestions.jsx';
import ShowGrid from '../components/ShowGrid.jsx';
import EmptyState from '../components/EmptyState.jsx';

const SUGGESTIONS = [
  { label: 'freeze dad', emoji: '🧊' },
  { label: 'wheels on the bus', emoji: '🚌' },
  { label: 'baby shark', emoji: '🦈' },
  { label: 'sleepytime', emoji: '💤' },
  { label: 'potty song', emoji: '🚽' },
  { label: 'elmo', emoji: '🔴' },
  { label: 'the one with the balloon', emoji: '🎈' },
  { label: 'george at the hospital', emoji: '🏥' },
];

const PAGE_SIZE = 8;
const MAX_RESULTS = 24;

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const [filters, setFilters] = useState({});
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [recent, setRecent] = useState(getRecentSearches);

  useDocumentTitle(urlQuery ? `“${urlQuery}”` : '');

  // Keep the URL in sync (debounced) so searches are shareable and the back
  // button works.
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed === urlQuery) return;
      setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, urlQuery, setSearchParams]);

  // Browser back/forward changes the URL; mirror it into the input.
  useEffect(() => {
    setQuery((current) => (current.trim() === urlQuery ? current : urlQuery));
  }, [urlQuery]);

  useEffect(() => {
    setFilters({});
    setVisible(PAGE_SIZE);
  }, [urlQuery]);

  const allResults = useMemo(() => searchEpisodes(query, { limit: MAX_RESULTS }), [query]);
  const results = useMemo(
    () =>
      Object.keys(filters).length
        ? searchEpisodes(query, { limit: MAX_RESULTS, ...filters })
        : allResults,
    [query, filters, allResults]
  );
  const followUps = useMemo(
    () => (Object.keys(filters).length ? [] : generateFollowUps(allResults)),
    [allResults, filters]
  );
  const highlightTerms = useMemo(() => getHighlightTerms(query), [query]);

  useEffect(() => {
    if (urlQuery.length >= 3 && allResults.length > 0) setRecent(addRecentSearch(urlQuery));
  }, [urlQuery, allResults.length]);

  const hasQuery = query.trim().length > 0;
  const answerFollowUp = (type, value) => {
    if (value === null) return;
    setFilters((current) => ({ ...current, [type]: value }));
  };

  return (
    <div className="container">
      <section className="hero">
        <img className="hero__logo" src="/logo.png" alt="Babbling Banks" width="150" height="150" />
        <h1 className="hero__title">
          Find any episode from a<span>toddler&apos;s description</span>
        </h1>
        <p className="hero__tagline">“The one where the dog freezes dad” → We&apos;ll find it.</p>
      </section>

      <SearchBox value={query} onChange={setQuery} autoFocus />

      {!hasQuery && (
        <div className="stack" style={{ gap: 28, marginTop: 24 }}>
          <section>
            <h2 className="section-label">Try searching for…</h2>
            <div className="chip-row">
              {SUGGESTIONS.map((item) => (
                <button
                  type="button"
                  className="chip"
                  key={item.label}
                  onClick={() => setQuery(item.label)}
                >
                  <span aria-hidden="true">{item.emoji}</span> {item.label}
                </button>
              ))}
            </div>
          </section>
          {recent.length > 0 && (
            <section>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <h2 className="section-label">Recent searches</h2>
                <button
                  type="button"
                  className="btn--link"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => setRecent(clearRecentSearches())}
                >
                  Clear
                </button>
              </div>
              <div className="chip-row">
                {recent.map((item) => (
                  <button
                    type="button"
                    className="chip chip--small"
                    key={item}
                    onClick={() => setQuery(item)}
                  >
                    <span aria-hidden="true">🕘</span> {item}
                  </button>
                ))}
              </div>
            </section>
          )}
          <ShowGrid />
        </div>
      )}

      {hasQuery && (
        <div className="stack" style={{ gap: 18, marginTop: 20 }}>
          {Object.keys(filters).length > 0 && (
            <div className="filter-bar" aria-label="Active filters">
              <span>Filtered by:</span>
              {Object.entries(filters).map(([type, value]) => (
                <button
                  type="button"
                  className="chip chip--small chip--filter"
                  key={type}
                  onClick={() => setFilters(({ [type]: _removed, ...rest }) => rest)}
                  aria-label={`Remove filter ${value}`}
                >
                  {type === 'show' ? getShowName(value) : value}{' '}
                  <span className="chip__remove">✕</span>
                </button>
              ))}
              <button type="button" className="btn--link" onClick={() => setFilters({})}>
                Clear all
              </button>
            </div>
          )}

          <FollowUpQuestions questions={followUps} onAnswer={answerFollowUp} />

          {results.length > 0 && (
            <section aria-live="polite">
              <div className="results-count">
                Found {results.length}
                {results.length >= MAX_RESULTS ? '+' : ''} episode{results.length === 1 ? '' : 's'}
              </div>
              <div className="stack">
                {results.slice(0, visible).map((result, index) => (
                  <EpisodeCard
                    key={result.episode.id}
                    episode={result.episode}
                    matches={result.matches}
                    highlightTerms={highlightTerms}
                    index={index}
                  />
                ))}
              </div>
              {results.length > visible && (
                <div style={{ textAlign: 'center', marginTop: 18 }}>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  >
                    Show more results
                  </button>
                </div>
              )}
            </section>
          )}

          {results.length === 0 && (
            <EmptyState title="No episodes found">
              <p>
                Try fewer words, a character&apos;s name, or something that happened in the episode.
              </p>
              {Object.keys(filters).length > 0 && (
                <p style={{ marginTop: 8 }}>
                  <button type="button" className="btn--link" onClick={() => setFilters({})}>
                    Remove filters
                  </button>
                </p>
              )}
            </EmptyState>
          )}
        </div>
      )}
    </div>
  );
}
