import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AssistantProvider } from './context/AssistantContext';
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
import { CalendarPage } from './pages/CalendarPage';
import { TodoPage } from './pages/TodoPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { MarketLeaderPage } from './pages/MarketLeaderPage';
import { QuotePage } from './pages/QuotePage';
import { CountryCoveragePage } from './pages/CountryCoveragePage';
import { DatenschutzPage } from './pages/DatenschutzPage';

export default function App() {
  return (
    <MicrosoftAuthProvider>
    <TenderProvider>
      <ViewModeProvider>
        <AssistantProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="command" element={<CommandCenterPage />} />
              <Route path="plan" element={<MarketLeaderPage />} />
              <Route path="quote" element={<QuotePage />} />
              <Route path="tenders" element={<TendersPage />} />
              <Route path="tenders/:id" element={<TenderDetailPage />} />
              <Route path="go-no-go" element={<GoNoGoPage />} />
              <Route path="workflow" element={<WorkflowPage />} />
              <Route path="watchlist" element={<WatchlistPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="todo" element={<TodoPage />} />
              <Route path="alerts" element={<AlertsPageRoute />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="similarity" element={<SimilarityPage />} />
              <Route path="profiles" element={<ProfilesPage />} />
              <Route path="coverage" element={<CountryCoveragePage />} />
              <Route path="datenschutz" element={<DatenschutzPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </AssistantProvider>
      </ViewModeProvider>
    </TenderProvider>
    </MicrosoftAuthProvider>
  );
}
