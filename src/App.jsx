import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import EpisodePage from './pages/EpisodePage.jsx';
import ShowPage from './pages/ShowPage.jsx';
import ShowsPage from './pages/ShowsPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shows" element={<ShowsPage />} />
        <Route path="/show/:showId" element={<ShowPage />} />
        <Route path="/episode/:id" element={<EpisodePage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
