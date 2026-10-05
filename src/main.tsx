import React from 'react';
import {createRoot} from 'react-dom/client';
import {App,ErrorBoundary} from './App';
import './styles.css';
const root=document.getElementById('root');
if(!root)throw new Error('Élément racine introuvable.');
createRoot(root).render(<ErrorBoundary><App/></ErrorBoundary>);
