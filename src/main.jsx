import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import { initViewportFix } from './core/MobileViewportFix';

// Blindaje de viewport ANTES de montar React — evita dimensiones erróneas al arranque
initViewportFix();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
