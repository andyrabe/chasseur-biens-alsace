import { useEffect, useState, type ReactNode } from 'react';

export function ChampTexte(p: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  aide?: ReactNode;
  type?: string;
  placeholder?: string;
  multiligne?: boolean;
  lignes?: number;
}) {
  return (
    <label className="champ">
      <span>{p.libelle}</span>
      {p.multiligne ? (
        <textarea rows={p.lignes ?? 4} value={p.valeur} placeholder={p.placeholder} onChange={(e) => p.onChange(e.target.value)} />
      ) : (
        <input type={p.type ?? 'text'} value={p.valeur} placeholder={p.placeholder} onChange={(e) => p.onChange(e.target.value)} />
      )}
      {p.aide && <small>{p.aide}</small>}
    </label>
  );
}

/** Saisie numérique tolérante (espaces, virgule décimale). Vide = undefined. */
export function ChampNombre(p: {
  libelle: string;
  valeur: number | undefined;
  onChange: (v: number | undefined) => void;
  unite?: string;
  aide?: ReactNode;
  pas?: number;
}) {
  const formater = (n: number | undefined) => (n == null ? '' : n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }));
  const [texte, setTexte] = useState(formater(p.valeur));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setTexte(formater(p.valeur));
  }, [p.valeur, focus]);
  return (
    <label className="champ">
      <span>{p.libelle}</span>
      <div className="saisie-unite">
        <input
          inputMode="decimal"
          style={p.unite ? { paddingRight: 16 + p.unite.length * 8.5 } : undefined}
          value={texte}
          onFocus={() => setFocus(true)}
          onBlur={() => {
            setFocus(false);
            setTexte(formater(p.valeur));
          }}
          onChange={(e) => {
            setTexte(e.target.value);
            const propre = e.target.value.replace(/[\s  ]/g, '').replace(',', '.');
            if (propre === '') return p.onChange(undefined);
            const n = Number(propre);
            if (Number.isFinite(n)) p.onChange(n);
          }}
        />
        {p.unite && <em>{p.unite}</em>}
      </div>
      {p.aide && <small>{p.aide}</small>}
    </label>
  );
}

export function ChampChoix<T extends string>(p: {
  libelle: string;
  valeur: T | '';
  options: readonly T[] | { valeur: T; libelle: string }[];
  onChange: (v: T) => void;
  vide?: string;
  aide?: ReactNode;
}) {
  const opts = (p.options as any[]).map((o) => (typeof o === 'string' ? { valeur: o, libelle: o } : o));
  return (
    <label className="champ">
      <span>{p.libelle}</span>
      <select value={p.valeur} onChange={(e) => p.onChange(e.target.value as T)}>
        {p.vide !== undefined && <option value="">{p.vide}</option>}
        {opts.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
      {p.aide && <small>{p.aide}</small>}
    </label>
  );
}

export function PastilleDPE({ classe }: { classe?: string }) {
  return (
    <span className={`dpe ${classe ? 'dpe-' + classe : 'dpe-inconnu'}`} title={classe ? `DPE classe ${classe}` : 'DPE inconnu'}>
      {classe ?? '?'}
    </span>
  );
}
