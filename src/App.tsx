import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { RequireAdmin } from './components/RequireAdmin';
import { HomeRedirect } from './components/HomeRedirect';
import { AssistantProvider } from './context/AssistantContext';
import { AppAuthProvider } from './context/AppAuthContext';
import { MicrosoftAuthProvider } from './context/MicrosoftAuthContext';
import { TenderProvider } from './context/TenderContext';
import { ViewModeProvider } from './context/ViewModeContext';
import { TenderDetailPage } from './pages/TenderDetailPage';
import { TendersPage } from './pages/TendersPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { GoNoGoPage } from './pages/GoNoGoPage';
import { AlertsPageRoute } from './pages/AlertsPageRoute';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { CalendarPage } from './pages/CalendarPage';
import { TodoPage } from './pages/TodoPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { QuotePage } from './pages/QuotePage';
import { CountryCoveragePage } from './pages/CountryCoveragePage';
import { OpportunitiesPage } from './pages/OpportunitiesPage';
import { DatenschutzPage } from './pages/DatenschutzPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { CustomerPrioritiesPage } from './pages/CustomerPrioritiesPage';
import { RequirePasswordChange } from './components/RequirePasswordChange';

function PrioritiesRoute() {
  const [searchParams] = useSearchParams();
  if (searchParams.has('territory')) {
    const next = new URLSearchParams(searchParams);
    next.delete('territory');
    return <Navigate to={`/priorities?${next.toString()}`} replace />;
  }
  return <CustomerPrioritiesPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <AppAuthProvider>
    <MicrosoftAuthProvider>
    <ViewModeProvider>
    <TenderProvider>
        <AssistantProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<RequirePasswordChange />}>
              <Route element={<Layout />}>
              <Route index element={<HomeRedirect />} />
              <Route path="command-center" element={<CommandCenterPage />} />
              <Route path="command" element={<Navigate to="/command-center" replace />} />
              <Route path="priorities" element={<PrioritiesRoute />} />
              <Route path="tourenplanung" element={<Navigate to="/priorities" replace />} />
              <Route path="kunden-prioritaet" element={<Navigate to="/priorities" replace />} />
              <Route path="customer-priorities" element={<Navigate to="/priorities" replace />} />
              <Route path="datenschutz" element={<DatenschutzPage />} />
              <Route element={<RequireAdmin />}>
              <Route path="dashboard" element={<Navigate to="/command-center?tab=kpis" replace />} />
              <Route path="pipeline" element={<Navigate to="/command-center?tab=pipeline" replace />} />
              <Route path="plan" element={<Navigate to="/command-center?tab=plan" replace />} />
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
              <Route path="similarity" element={<Navigate to="/analytics?tab=aehnlichkeiten" replace />} />
              <Route path="profiles" element={<ProfilesPage />} />
              <Route path="coverage" element={<CountryCoveragePage />} />
              <Route path="opportunities" element={<OpportunitiesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              </Route>
              </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        </AssistantProvider>
    </TenderProvider>
    </ViewModeProvider>
    </MicrosoftAuthProvider>
    </AppAuthProvider>
    </ErrorBoundary>
  );
}
