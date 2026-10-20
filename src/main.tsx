import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { App } from './App';
import { FournisseurDonnees } from './contexte';

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    <FournisseurDonnees>
      <App />
    </FournisseurDonnees>
  </StrictMode>,
);
