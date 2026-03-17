import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import PassportPage from './src/pages/PassportPage';
import InvitePage from './src/pages/InvitePage';
import RedeemPage from './src/pages/RedeemPage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { LiffProvider } from './src/contexts/LiffContext';
import { SupabaseAuthProvider } from './src/contexts/SupabaseAuthContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SupabaseAuthProvider>
      <LiffProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/passport/:id" element={<PassportPage />} />
            <Route path="/invite/:id" element={<InvitePage />} />
            <Route path="/redeem" element={<RedeemPage />} />
            <Route path="*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </LiffProvider>
    </SupabaseAuthProvider>
  </React.StrictMode>
);