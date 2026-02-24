import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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
        <App />
      </LiffProvider>
    </SupabaseAuthProvider>
  </React.StrictMode>
);