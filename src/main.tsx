import React from 'react';
import {createRoot} from 'react-dom/client';
import {App,ErrorBoundary} from './App';
import './styles.css';
import './auth.css';
import {AuthGate} from './auth';
const root=document.getElementById('root');
if(!root)throw new Error('Élément racine introuvable.');
createRoot(root).render(<ErrorBoundary><AuthGate><App/></AuthGate></ErrorBoundary>);
