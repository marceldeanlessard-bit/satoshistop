import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Note: using index.css for global styles + Tailwind
import './styles/main.css';
import { initSentry } from './utils/sentry';

initSentry();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
