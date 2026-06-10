import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MicrosoftAuthProvider } from './context/MicrosoftAuthContext';
import { TenderProvider } from './context/TenderContext';
import { ViewModeProvider } from './context/ViewModeContext';
import { DashboardPage } from './pages/DashboardPage';
import { TenderDetailPage } from './pages/TenderDetailPage';
import { TendersPage } from './pages/TendersPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { GoNoGoPage } from './pages/GoNoGoPage';
import { AlertsPageRoute } from './pages/AlertsPageRoute';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SimilarityPage } from './pages/SimilarityPage';
import { ProfilesPage } from './pages/ProfilesPage';

export default function App() {
  return (
    <MicrosoftAuthProvider>
    <TenderProvider>
      <ViewModeProvider>
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
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="similarity" element={<SimilarityPage />} />
              <Route path="profiles" element={<ProfilesPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ViewModeProvider>
    </TenderProvider>
    </MicrosoftAuthProvider>
  );
}
