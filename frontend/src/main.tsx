import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Ignore missing type declarations for CSS side-effect import
// TypeScript projects often declare modules for CSS (e.g. via "declare module '*.css'"),
// but to avoid adding global typings here we suppress the error for this import.
// @ts-ignore
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);