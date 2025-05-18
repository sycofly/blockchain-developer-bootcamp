import React from 'react';
import ReactDOM from 'react-dom/client';
import "./App.css";
import App from './components/App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import store from './store/store';

// Set up console overrides to reduce noise
const setupConsoleOverrides = () => {
  // Store originals 
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  // Patterns to completely suppress
  const suppressPatterns = [
    'network does not support ENS',
    'getResolver',
    'UNSUPPORTED_OPERATION',
    'ENS name not specified',
    'ENS name not configured',
    'ENS',
    'Couldn\'t resolve account',
    'invalid address',
    'componentWillUpdate',
    'componentWillReceiveProps',
    'componentWillMount'
  ];
  
  // Track which types of warnings we've logged to avoid spam
  window._loggedWarnings = {};
  
  // Override console.warn
  console.warn = function(msg, ...args) {
    // Convert to string for pattern matching
    const msgStr = String(msg);
    
    // Check if we should suppress this message
    for (const pattern of suppressPatterns) {
      if (msgStr.includes(pattern)) {
        // For ENS-related messages, show a single notice per pattern
        if (
          (pattern.includes('ENS') || pattern.includes('network')) && 
          !window._loggedWarnings[pattern]
        ) {
          console.log(`Notice: ${pattern} warnings suppressed (normal on testnets)`);
          window._loggedWarnings[pattern] = true;
        }
        
        // For Identicon/React warnings, only suppress if it's specifically about the component
        if (
          (pattern.includes('component') && !msgStr.includes('Identicon')) ||
          !pattern.includes('component')
        ) {
          return; // Suppress the warning completely
        }
      }
    }
    
    // Pass through all other warnings
    originalConsoleWarn.apply(console, [msg, ...args]);
  };
  
  // Override console.error to catch similar errors
  console.error = function(msg, ...args) {
    // Convert to string for pattern matching
    const msgStr = String(msg);
    
    // Check if we should suppress this message
    for (const pattern of suppressPatterns) {
      if (msgStr.includes(pattern)) {
        // For ENS-related errors, show a single notice
        if (
          (pattern.includes('ENS') || pattern.includes('network')) && 
          !window._loggedWarnings[`error-${pattern}`]
        ) {
          console.log(`Notice: ${pattern} errors suppressed (normal on testnets)`);
          window._loggedWarnings[`error-${pattern}`] = true;
        }
        return; // Suppress the error completely
      }
    }
    
    // Pass through all other errors
    originalConsoleError.apply(console, [msg, ...args]);
  };
};

// Apply the console overrides
setupConsoleOverrides();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
