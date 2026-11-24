import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './shell';
import '@fontsource-variable/inter';
import './style.css';

const cache=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:15000,refetchOnWindowFocus:false}}});
createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={cache}><BrowserRouter><App/></BrowserRouter></QueryClientProvider></React.StrictMode>);
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(()=>{});

