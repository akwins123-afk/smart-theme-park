import React, { useState, useEffect } from 'react';
import Navbar from './components/common/Navbar';
import LandingPage from './components/landing/LandingPage';
import CustomerPortal from './components/customer/CustomerPortal';
import AdminPortal from './components/admin/AdminPortal';
import RuleBlockedModal from './components/common/RuleBlockedModal';
import SqlInspectorDrawer from './components/common/SqlInspectorDrawer';
import { useSSE } from './hooks/useSSE';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'customer', 'admin'
  
  // Auth state
  const [customerUser, setCustomerUser] = useState(() => {
    const saved = localStorage.getItem('theme_park_customer_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [customerToken, setCustomerToken] = useState(() => {
    return localStorage.getItem('theme_park_customer_token') || null;
  });

  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem('theme_park_admin_token') || null;
  });

  // Diagnostic modal for database constraint & trigger violations
  const [activeErrorModal, setActiveErrorModal] = useState(null);

  // Real-time Server-Sent Events bus
  const { connected: sseConnected, lastEvent, sqlQueries, clearQueries } = useSSE();

  // Save auth tokens
  useEffect(() => {
    if (customerUser) {
      localStorage.setItem('theme_park_customer_user', JSON.stringify(customerUser));
    } else {
      localStorage.removeItem('theme_park_customer_user');
    }
  }, [customerUser]);

  useEffect(() => {
    if (customerToken) {
      localStorage.setItem('theme_park_customer_token', customerToken);
    } else {
      localStorage.removeItem('theme_park_customer_token');
    }
  }, [customerToken]);

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem('theme_park_admin_token', adminToken);
    } else {
      localStorage.removeItem('theme_park_admin_token');
    }
  }, [adminToken]);

  // Auth Handlers
  const handleCustomerLoginSuccess = (user, token) => {
    setCustomerUser(user);
    setCustomerToken(token);
    setCurrentView('customer');
  };

  const handleAdminLoginSuccess = (token) => {
    setAdminToken(token);
    setCurrentView('admin');
  };

  const handleLogoutCustomer = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/customer/logout', { method: 'POST' });
    } catch (e) {}
    setCustomerUser(null);
    setCustomerToken(null);
    setCurrentView('landing');
  };

  const handleLogoutAdmin = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/admin/logout', { method: 'POST' });
    } catch (e) {}
    setAdminToken(null);
    setCurrentView('landing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        customerUser={customerUser}
        adminUser={adminToken ? { role: 'admin' } : null}
        onLogoutCustomer={handleLogoutCustomer}
        onLogoutAdmin={handleLogoutAdmin}
        sseConnected={sseConnected}
      />

      {/* Main Viewport Content */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onCustomerLoginSuccess={handleCustomerLoginSuccess}
            onAdminLoginSuccess={handleAdminLoginSuccess}
            onNavigateToCustomer={() => setCurrentView('customer')}
            onNavigateToAdmin={() => setCurrentView('admin')}
          />
        )}

        {currentView === 'customer' && (
          customerUser && customerToken ? (
            <CustomerPortal
              user={customerUser}
              token={customerToken}
              onLogout={handleLogoutCustomer}
              lastSseEvent={lastEvent}
              onErrorTrigger={(err) => setActiveErrorModal(err)}
            />
          ) : (
            <LandingPage
              onCustomerLoginSuccess={handleCustomerLoginSuccess}
              onAdminLoginSuccess={handleAdminLoginSuccess}
              onNavigateToCustomer={() => setCurrentView('customer')}
              onNavigateToAdmin={() => setCurrentView('admin')}
            />
          )
        )}

        {currentView === 'admin' && (
          adminToken ? (
            <AdminPortal
              token={adminToken}
              onLogout={handleLogoutAdmin}
              onErrorTrigger={(err) => setActiveErrorModal(err)}
              lastSseEvent={lastEvent}
            />
          ) : (
            <LandingPage
              onCustomerLoginSuccess={handleCustomerLoginSuccess}
              onAdminLoginSuccess={handleAdminLoginSuccess}
              onNavigateToCustomer={() => setCurrentView('customer')}
              onNavigateToAdmin={() => setCurrentView('admin')}
            />
          )
        )}
      </main>

      {/* Database Constraint Rejection Modal */}
      <RuleBlockedModal
        errorData={activeErrorModal}
        onClose={() => setActiveErrorModal(null)}
      />

      {/* Live SQL Inspector Floating Drawer */}
      <SqlInspectorDrawer
        sqlQueries={sqlQueries}
        onClear={clearQueries}
      />

    </div>
  );
}
