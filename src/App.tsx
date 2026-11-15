import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { WelcomePage } from './pages/WelcomePage';
import { HelpSupportPage } from './pages/HelpSupportPage';
import { LoginPage } from './pages/LoginPage';
import { LeaderDashboardPage } from './pages/leader/LeaderDashboardPage';
import { LeaderOrdersPage } from './pages/leader/LeaderOrdersPage';
import { VoiceOrderIntakePage } from './pages/leader/VoiceOrderIntakePage';
import { PricingPage } from './pages/leader/PricingPage';
import { WorkAllocationPage } from './pages/leader/WorkAllocationPage';
import { ProductionTrackingPage } from './pages/leader/ProductionTrackingPage';
import { QualityInspectionPage } from './pages/leader/QualityInspectionPage';
import { OrderConsolidationPage } from './pages/leader/OrderConsolidationPage';
import { PayoutSummaryPage } from './pages/leader/PayoutSummaryPage';
import { MembersPage } from './pages/leader/MembersPage';
import { MemberDashboardPage } from './pages/member/MemberDashboardPage';
import { MemberWorkPage } from './pages/member/MemberWorkPage';
import { MemberProgressPage } from './pages/member/MemberProgressPage';
import { MemberEarningsPage } from './pages/member/MemberEarningsPage';
import { MemberAudioSummaryPage } from './pages/member/MemberAudioSummaryPage';
import { SettingsPage } from './pages/SettingsPage';
import type { UserRole } from './types';

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8EF] flex items-center justify-center text-sm font-medium text-[#075B62]">
        Loading SahayakSHG...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === 'leader' ? '/leader/dashboard' : '/member/dashboard'}
        replace
      />
    );
  }

  return <>{children}</>;
}

/**
 * Ensures seamless full-screen access across the 5 standalone workflow screens
 * (/voice-intake, /work-allocation, /order-progress, /payout-summary, /member-audio)
 * and Profile & Settings by activating the matching demo role session when needed.
 */
function WorkflowScreenRoute({
  requiredRole,
  anyAuthenticated = false,
  children,
}: {
  requiredRole?: UserRole;
  anyAuthenticated?: boolean;
  children: React.ReactNode;
}) {
  const { user, loading, loginDemo } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const attemptedKeyRef = React.useRef<string | null>(null);

  const needsSwitch = anyAuthenticated
    ? !user
    : Boolean(requiredRole && (!user || user.role !== requiredRole));
  const targetUserId = requiredRole === 'member' ? 'USR-MEM-03' : 'USR-LEADER-01';
  const attemptKey = requiredRole || 'any';

  useEffect(() => {
    if (!needsSwitch) {
      attemptedKeyRef.current = null;
      setSwitchError(null);
      return;
    }
    if (!loading && needsSwitch && attemptedKeyRef.current !== attemptKey) {
      attemptedKeyRef.current = attemptKey;
      setSwitching(true);
      setSwitchError(null);
      loginDemo(targetUserId)
        .catch((err) => {
          setSwitchError(err instanceof Error ? err.message : 'Unable to start demo session');
        })
        .finally(() => {
          setSwitching(false);
        });
    }
  }, [loading, needsSwitch, attemptKey, targetUserId, loginDemo]);

  if (switchError) {
    return (
      <div className="min-h-screen bg-[#FFF8EF] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm font-medium text-[#991B1B]">{switchError}</p>
        <button
          type="button"
          onClick={() => {
            attemptedKeyRef.current = null;
            setSwitchError(null);
            setSwitching(true);
            loginDemo(targetUserId).finally(() => setSwitching(false));
          }}
          className="min-h-[44px] px-5 py-2 rounded-xl bg-[#075B62] text-white text-sm font-semibold"
        >
          Retry Session
        </button>
      </div>
    );
  }

  if (loading || switching || needsSwitch) {
    return (
      <div className="min-h-screen bg-[#FFF8EF] flex items-center justify-center text-sm font-medium text-[#075B62]">
        Loading SahayakSHG...
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <BrowserRouter>
          <Routes>
            {/* Page 1: Welcome & Home */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/help" element={<HelpSupportPage />} />

            {/* 5 Separate Full-Screen Application Routes */}
            <Route
              path="/voice-intake"
              element={
                <WorkflowScreenRoute requiredRole="leader">
                  <VoiceOrderIntakePage shell="workflow" />
                </WorkflowScreenRoute>
              }
            />
            <Route
              path="/work-allocation"
              element={
                <WorkflowScreenRoute requiredRole="leader">
                  <WorkAllocationPage shell="workflow" />
                </WorkflowScreenRoute>
              }
            />
            <Route
              path="/order-progress"
              element={
                <WorkflowScreenRoute requiredRole="leader">
                  <ProductionTrackingPage shell="workflow" />
                </WorkflowScreenRoute>
              }
            />
            <Route
              path="/payout-summary"
              element={
                <WorkflowScreenRoute requiredRole="leader">
                  <PayoutSummaryPage shell="workflow" />
                </WorkflowScreenRoute>
              }
            />
            <Route
              path="/member-audio"
              element={
                <WorkflowScreenRoute requiredRole="member">
                  <MemberAudioSummaryPage shell="workflow" />
                </WorkflowScreenRoute>
              }
            />

            {/* Leader Portal Routes */}
            <Route
              path="/leader/dashboard"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <LeaderDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leader/orders"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <LeaderOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leader/orders/new"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <VoiceOrderIntakePage shell="portal" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leader/pricing"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <PricingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leader/allocation"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <WorkAllocationPage shell="portal" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leader/progress"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <ProductionTrackingPage shell="portal" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leader/quality"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <QualityInspectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leader/consolidation"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <OrderConsolidationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leader/payouts"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <PayoutSummaryPage shell="portal" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leader/members"
              element={
                <ProtectedRoute allowedRoles={['leader']}>
                  <MembersPage />
                </ProtectedRoute>
              }
            />

            {/* Member Portal Routes */}
            <Route
              path="/member/dashboard"
              element={
                <ProtectedRoute allowedRoles={['member']}>
                  <MemberDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/work"
              element={
                <ProtectedRoute allowedRoles={['member']}>
                  <MemberWorkPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/progress"
              element={
                <ProtectedRoute allowedRoles={['member']}>
                  <MemberProgressPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/earnings"
              element={
                <ProtectedRoute allowedRoles={['member']}>
                  <MemberEarningsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/audio-summary"
              element={
                <ProtectedRoute allowedRoles={['member']}>
                  <MemberAudioSummaryPage shell="portal" />
                </ProtectedRoute>
              }
            />

            {/* Shared Profile & Settings Route */}
            <Route
              path="/settings"
              element={
                <WorkflowScreenRoute anyAuthenticated>
                  <SettingsPage />
                </WorkflowScreenRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </OfflineProvider>
    </AuthProvider>
  );
}
