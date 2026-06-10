import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TenderProvider } from './context/TenderContext';
import { DashboardPage } from './pages/DashboardPage';
import { TenderDetailPage } from './pages/TenderDetailPage';
import { TendersPage } from './pages/TendersPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { GoNoGoPage } from './pages/GoNoGoPage';
import { AlertsPageRoute } from './pages/AlertsPageRoute';

export default function App() {
  return (
    <TenderProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="tenders" element={<TendersPage />} />
            <Route path="tenders/:id" element={<TenderDetailPage />} />
            <Route path="go-no-go" element={<GoNoGoPage />} />
            <Route path="workflow" element={<WorkflowPage />} />
            <Route path="watchlist" element={<WatchlistPage />} />
            <Route path="alerts" element={<AlertsPageRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TenderProvider>
  );
}
