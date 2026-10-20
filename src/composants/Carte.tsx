import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { ATTRIBUTION_IGN, COUCHES } from '../lib/geo';

export interface Repere {
  id: string;
  lat: number;
  lon: number;
  titre: string;
  couleur?: string;
}

const CENTRE_ALSACE: L.LatLngTuple = [48.25, 7.45];

/**
 * Carte IGN avec plan, photo aérienne et calque du cadastre.
 * `onClic` permet de placer un bien en cliquant sur sa parcelle.
 */
export function Carte(p: {
  reperes: Repere[];
  onSelection?: (id: string) => void;
  onClic?: (lat: number, lon: number) => void;
  centre?: { lat: number; lon: number; zoom?: number };
  cadastre?: boolean;
  petite?: boolean;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<L.Map>();
  const calque = useRef<L.LayerGroup>();
  const rappels = useRef(p);
  rappels.current = p;

  useEffect(() => {
    if (!conteneur.current) return;
    const plan = L.tileLayer(COUCHES.plan, { attribution: ATTRIBUTION_IGN, maxZoom: 19, maxNativeZoom: 19 });
    const photo = L.tileLayer(COUCHES.photo, { attribution: ATTRIBUTION_IGN, maxZoom: 20, maxNativeZoom: 19 });
    const cadastre = L.tileLayer(COUCHES.cadastre, { attribution: ATTRIBUTION_IGN, maxZoom: 20, maxNativeZoom: 19, minZoom: 14 });
    const m = L.map(conteneur.current, { layers: [plan], zoomControl: true }).setView(CENTRE_ALSACE, 8);
    if (p.cadastre) cadastre.addTo(m);
    L.control.layers({ Plan: plan, 'Photo aérienne': photo }, { Cadastre: cadastre }, { position: 'topright' }).addTo(m);
    calque.current = L.layerGroup().addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => rappels.current.onClic?.(e.latlng.lat, e.latlng.lng));
    carte.current = m;
    return () => {
      m.remove();
      carte.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repères
  useEffect(() => {
    const m = carte.current;
    const g = calque.current;
    if (!m || !g) return;
    g.clearLayers();
    const points: L.LatLngTuple[] = [];
    for (const r of p.reperes) {
      const marqueur = L.circleMarker([r.lat, r.lon], {
        radius: 9,
        weight: 2.5,
        color: '#ffffff',
        fillColor: r.couleur ?? '#a3402d',
        fillOpacity: 1,
      }).bindTooltip(r.titre);
      marqueur.on('click', () => rappels.current.onSelection?.(r.id));
      marqueur.addTo(g);
      points.push([r.lat, r.lon]);
    }
    if (!p.centre) {
      if (points.length === 1) m.setView(points[0], 16);
      else if (points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }
  }, [p.reperes, p.centre]);

  // Centrage explicite
  useEffect(() => {
    if (p.centre && carte.current) carte.current.setView([p.centre.lat, p.centre.lon], p.centre.zoom ?? 18);
  }, [p.centre?.lat, p.centre?.lon, p.centre?.zoom]);

  // La carte doit se recalculer quand son conteneur change de taille.
  useEffect(() => {
    if (!conteneur.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => carte.current?.invalidateSize());
    ro.observe(conteneur.current);
    return () => ro.disconnect();
  }, []);

  return <div ref={conteneur} className={`carte${p.petite ? ' petite' : ''}`} role="region" aria-label="Carte" />;
}

export const COULEUR_STATUT: Record<string, string> = {
  Repéré: '#7a8a93',
  'Propriétaire identifié': '#5c7fa3',
  Contacté: '#2a5b87',
  Visité: '#1f4a73',
  'Offre faite': '#a3402d',
  'Compromis / adjudication': '#86331f',
  Acquis: '#4a7533',
  Abandonné: '#b5bdb8',
};
