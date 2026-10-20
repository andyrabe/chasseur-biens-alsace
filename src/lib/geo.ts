// Services publics de l'IGN (Géoplateforme) : géocodage d'adresses et
// parcelles cadastrales. Gratuits, sans clé, appelables depuis le navigateur.

export interface Adresse {
  label: string;
  commune: string;
  codeInsee: string;
  lat: number;
  lon: number;
  score: number;
  precision: string; // housenumber, street, municipality…
}

export interface Parcelle {
  idu: string; // identifiant unique, ex. 67434000150094
  codeInsee: string;
  commune: string;
  section: string;
  numero: string;
  contenanceM2: number;
}

export async function chercherAdresses(texte: string, signal?: AbortSignal): Promise<Adresse[]> {
  if (texte.trim().length < 4) return [];
  const url = new URL('https://data.geopf.fr/geocodage/search');
  url.searchParams.set('q', texte);
  url.searchParams.set('limit', '6');
  url.searchParams.set('autocomplete', '1');
  const rep = await fetch(url, { signal });
  if (!rep.ok) throw new Error(`Recherche d’adresse indisponible (${rep.status})`);
  const json = await rep.json();
  return (json.features ?? []).map((f: any) => ({
    label: f.properties.label,
    commune: f.properties.city,
    codeInsee: f.properties.citycode,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    score: f.properties.score ?? 0,
    precision: f.properties.type ?? '',
  }));
}

/** Parcelle cadastrale contenant le point. */
export async function parcelleAuPoint(lat: number, lon: number): Promise<Parcelle | undefined> {
  const url = new URL('https://apicarto.ign.fr/api/cadastre/parcelle');
  url.searchParams.set('geom', JSON.stringify({ type: 'Point', coordinates: [lon, lat] }));
  const rep = await fetch(url);
  if (!rep.ok) throw new Error(`Service du cadastre indisponible (${rep.status})`);
  const json = await rep.json();
  const p = json.features?.[0]?.properties;
  if (!p) return undefined;
  return {
    idu: p.idu,
    codeInsee: p.code_insee,
    commune: p.nom_com,
    section: p.section,
    numero: p.numero,
    contenanceM2: p.contenance,
  };
}

export const libelleParcelle = (p: Parcelle) =>
  `${p.commune} — section ${p.section.replace(/^0+/, '')} n° ${p.numero.replace(/^0+/, '')} (${p.contenanceM2.toLocaleString('fr-FR')} m²)`;

/** Liens utiles pour étudier un bien. */
export function liensUtiles(b: { lat?: number; lon?: number; codeInsee?: string; adresse?: string }) {
  const liens: { libelle: string; url: string; aide: string }[] = [];
  if (b.lat != null && b.lon != null) {
    liens.push({
      libelle: 'Géoportail (cadastre)',
      url: `https://www.geoportail.gouv.fr/carte?c=${b.lon},${b.lat}&z=19&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&l1=CADASTRALPARCELS.PARCELLAIRE_EXPRESS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`,
      aide: 'Photo aérienne et limites de parcelles',
    });
    liens.push({
      libelle: 'Prix de vente autour',
      url: `https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&lat=${b.lat}&lng=${b.lon}&zoom=17`,
      aide: 'Ventes réelles (DVF) des dernières années',
    });
    liens.push({
      libelle: 'Géorisques',
      url: `https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi/rapport2?form-adresse=true&isCadastre=false&city=&type=housenumber&typeForm=adresse&codeInsee=${b.codeInsee ?? ''}&lon=${b.lon}&lat=${b.lat}&adresse=${encodeURIComponent(b.adresse ?? '')}`,
      aide: 'Inondation, coulées de boue, sols pollués…',
    });
    liens.push({
      libelle: 'Street View',
      url: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${b.lat},${b.lon}`,
      aide: 'Voir la façade sans se déplacer',
    });
  }
  if (b.codeInsee) {
    liens.push({
      libelle: 'Plan local d’urbanisme',
      url: `https://www.geoportail-urbanisme.gouv.fr/map/#tile=1&lon=${b.lon ?? ''}&lat=${b.lat ?? ''}&zoom=17`,
      aide: 'Zone constructible ? Division possible ?',
    });
  }
  return liens;
}

/** Couches de carte IGN (WMTS, projection Web Mercator). */
const wmts = (couche: string, style: string, format: string) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${couche}&STYLE=${encodeURIComponent(style)}&TILEMATRIXSET=PM&FORMAT=${format}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;

export const COUCHES = {
  plan: wmts('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'normal', 'image/png'),
  photo: wmts('ORTHOIMAGERY.ORTHOPHOTOS', 'normal', 'image/jpeg'),
  cadastre: wmts('CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'PCI vecteur', 'image/png'),
};
export const ATTRIBUTION_IGN = '© <a href="https://www.ign.fr/">IGN</a> — Géoplateforme';
