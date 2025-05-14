import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { TimeTrackingProvider } from './context/TimeTrackingContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TimeTrackingProvider>
          <App />
        </TimeTrackingProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);