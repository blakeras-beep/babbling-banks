import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchEpisodes, generateFollowUps } from '../lib/search.js';
import { getMatchedWords } from '../lib/matchedWords.js';
import { getShowName } from '../data/index.js';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '../lib/storage.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useArtCredit } from '../lib/CreditContext.jsx';
import { pieceFor } from '../lib/art.js';
import ArtBand from '../components/ArtBand.jsx';
import SearchField from '../components/SearchField.jsx';
import QuoteStrip from '../components/QuoteStrip.jsx';
import ResultCard from '../components/ResultCard.jsx';
import { ResultRows } from '../components/ResultRow.jsx';
import ExampleSearches from '../components/ExampleSearches.jsx';
import FollowUpQuestions from '../components/FollowUpQuestions.jsx';
import ShowGrid from '../components/ShowGrid.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';

const HOME_EXAMPLES = ['freeze dad', 'wheels on the bus', 'the one with the balloon'];
const EMPTY_EXAMPLES = ['baby shark', 'potty song', 'george at the hospital'];

const ROWS = 4;
const PAGE_SIZE = 8;
const MAX_RESULTS = 24;

const HOME_PIECE = pieceFor('home');
const RESULTS_PIECE = pieceFor('results');
const EMPTY_PIECE = pieceFor('empty-results');

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const [filters, setFilters] = useState({});
  const [visible, setVisible] = useState(ROWS);
  const [recent, setRecent] = useState(getRecentSearches);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

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
    setVisible(ROWS);
    setEditing(false);
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

  useEffect(() => {
    if (urlQuery.length >= 3 && allResults.length > 0) setRecent(addRecentSearch(urlQuery));
  }, [urlQuery, allResults.length]);

  const hasQuery = query.trim().length > 0;
  const hasResults = hasQuery && results.length > 0;
  const top = hasResults ? results[0] : null;
  const rest = hasResults ? results.slice(1) : [];
  const matched = useMemo(() => getMatchedWords(query, top), [query, top]);
  const filterCount = Object.keys(filters).length;

  useArtCredit(hasQuery ? (hasResults ? RESULTS_PIECE?.id : EMPTY_PIECE?.id) : HOME_PIECE?.id);

  const submit = (value) => {
    const trimmed = value.trim();
    setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true });
  };
  const answerFollowUp = (type, value) => {
    if (value === null) return;
    setFilters((current) => ({ ...current, [type]: value }));
  };
  // "Say it another way" / "Not it? Add a clue": swap the quote strip for the field.
  const sayItAnotherWay = () => {
    setEditing(true);
    window.scrollTo({ top: 0 });
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  if (!hasQuery) {
    return (
      <div className="home">
        <ArtBand pieceId={HOME_PIECE?.id} />
        <div className="col">
          <div className="tape tape--headline headline-strip">
            <h1 className="headline-strip__text">
              Toddler in.
              <br />
              Episode out.
            </h1>
          </div>
          <p className="lead">
            Say it exactly how they said it. Mumbles, sound effects, all of it.
          </p>
          <SearchField
            value={query}
            onChange={setQuery}
            onSubmit={submit}
            autoFocus
            inputRef={inputRef}
            formId="home-search"
          />
          <button type="submit" form="home-search" className="btn-primary home__button">
            Find it
          </button>
          <ExampleSearches examples={HOME_EXAMPLES} onPick={setQuery} />
          {recent.length > 0 && (
            <section>
              <div className="section-row">
                <h2 className="section-label">said before</h2>
                <button
                  type="button"
                  className="text-action"
                  onClick={() => setRecent(clearRecentSearches())}
                >
                  Clear
                </button>
              </div>
              <ul className="examples">
                {recent.map((item) => (
                  <li key={item}>
                    <button type="button" className="example-link" onClick={() => setQuery(item)}>
                      {'“'}
                      {item}
                      {'”'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ShowGrid />
        </div>
      </div>
    );
  }

  return (
    <div className={`results ${hasResults ? '' : 'results--empty'}`.trim()}>
      <ArtBand
        pieceId={hasResults ? RESULTS_PIECE?.id : EMPTY_PIECE?.id}
        height={430}
        className="results__band"
      />
      <div className="col">
        {editing ? (
          <SearchField
            value={query}
            onChange={setQuery}
            onSubmit={(value) => {
              submit(value);
              setEditing(false);
            }}
            inputRef={inputRef}
          />
        ) : (
          <QuoteStrip
            text={query}
            matched={hasResults ? matched : []}
            caption={hasResults ? undefined : 'You searched'}
          />
        )}

        {hasResults && (
          <>
            <div className="arrow-row" aria-hidden="true">
              <img className="arrow-row__arrow" src="/art/crayon-arrow-ink.png" alt="" />
              <p className="found-label">found it</p>
            </div>
            <section aria-live="polite">
              <ResultCard episode={top.episode} matches={top.matches} query={query} />
            </section>
          </>
        )}

        {filterCount > 0 && (
          <div className="filter-row" aria-label="Active filters">
            <span className="filter-row__label">Narrowed to</span>
            {Object.entries(filters).map(([type, value]) => (
              <button
                type="button"
                className="btn-secondary"
                key={type}
                onClick={() => setFilters(({ [type]: _removed, ...others }) => others)}
                aria-label={`Remove ${value}`}
              >
                {type === 'show' ? getShowName(value) : value}
                <Icon name="x" size={16} />
              </button>
            ))}
            <button type="button" className="text-action" onClick={() => setFilters({})}>
              Clear all
            </button>
          </div>
        )}

        <FollowUpQuestions questions={followUps} onAnswer={answerFollowUp} />

        {hasResults && rest.length > 0 && (
          <section>
            <h2 className="section-label">or maybe…</h2>
            <ResultRows episodes={rest.slice(0, visible).map((r) => r.episode)} query={query} />
          </section>
        )}

        {hasResults && !editing && (
          <div className="results__more">
            {rest.length > visible && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Show more
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={sayItAnotherWay}>
              Not it? Add a clue
            </button>
          </div>
        )}

        {!hasResults && (
          <>
            <EmptyState title="That one stumped us." examples={EMPTY_EXAMPLES} onPick={setQuery}>
              <p className="body-text">Try a character, a color, or a song they keep humming.</p>
              {filterCount > 0 && (
                <p className="body-text">
                  <button type="button" className="example-link" onClick={() => setFilters({})}>
                    Remove the narrowing
                  </button>
                </p>
              )}
            </EmptyState>
            <button type="button" className="btn-secondary" onClick={sayItAnotherWay}>
              Say it another way
            </button>
          </>
        )}
      </div>
    </div>
  );
}
