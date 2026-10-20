// Dates des annonces : "2026-11-20T14:00" (heure locale) ou "2026-11-20".

export function versDate(iso: string): Date {
  return new Date(iso.length === 10 ? iso + 'T12:00' : iso);
}

export function joursAvant(iso: string, maintenant = new Date()): number {
  const d = versDate(iso);
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const cible = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((cible.getTime() - debut.getTime()) / 86400000);
}

export function delaiLisible(iso: string): string {
  const j = joursAvant(iso);
  if (j === 0) return 'aujourd’hui';
  if (j === 1) return 'demain';
  if (j === -1) return 'hier';
  if (j > 0) return `dans ${j} jours`;
  return `il y a ${-j} jours`;
}

export const dateLongue = (iso: string) =>
  versDate(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(iso.includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}) });

export const dateCourte = (iso: string) =>
  versDate(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', ...(iso.includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}) });

export const DEPARTEMENTS: Record<string, string> = { '68': 'Haut-Rhin', '67': 'Bas-Rhin', '57': 'Moselle' };
