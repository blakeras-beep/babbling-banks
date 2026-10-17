import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';

// Home ships in the main bundle; the rest load on demand behind the loading screen.
const EpisodePage = lazy(() => import('./pages/EpisodePage.jsx'));
const ShowPage = lazy(() => import('./pages/ShowPage.jsx'));
const ShowsPage = lazy(() => import('./pages/ShowsPage.jsx'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'));
const ArtPage = lazy(() => import('./pages/ArtPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shows" element={<ShowsPage />} />
        <Route path="/show/:showId" element={<ShowPage />} />
        <Route path="/episode/:id" element={<EpisodePage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/art" element={<ArtPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
