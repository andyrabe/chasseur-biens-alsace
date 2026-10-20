import { useEffect, useRef, useState } from 'react';
import { chercherAdresses, type Adresse } from '../lib/geo';

/** Saisie d'adresse avec suggestions de la Base Adresse Nationale. */
export function RechercheAdresse(p: { valeur: string; onChange: (v: string) => void; onChoix: (a: Adresse) => void }) {
  const [suggestions, setSuggestions] = useState<Adresse[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const minuteur = useRef<number>();
  const annulation = useRef<AbortController>();

  useEffect(() => () => window.clearTimeout(minuteur.current), []);

  const rechercher = (texte: string) => {
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(async () => {
      annulation.current?.abort();
      annulation.current = new AbortController();
      try {
        const res = await chercherAdresses(texte, annulation.current.signal);
        setSuggestions(res);
        setOuvert(res.length > 0);
        setErreur(undefined);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setErreur('Recherche d’adresse indisponible pour le moment. Vous pouvez cliquer sur la carte.');
      }
    }, 300);
  };

  return (
    <div className="champ" style={{ position: 'relative' }}>
      <label className="champ">
        <span>Adresse</span>
        <input
          value={p.valeur}
          placeholder="Ex. 18 rue du Muguet, Sarre-Union"
          autoComplete="off"
          onChange={(e) => {
            p.onChange(e.target.value);
            rechercher(e.target.value);
          }}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          onFocus={() => suggestions.length && setOuvert(true)}
          aria-autocomplete="list"
          aria-expanded={ouvert}
        />
      </label>
      {ouvert && (
        <ul className="suggestions" role="listbox">
          {suggestions.map((s) => (
            <li key={s.label + s.lat}>
              <button
                type="button"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  p.onChoix(s);
                  setOuvert(false);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {erreur ? <small style={{ color: 'var(--ocre)' }}>{erreur}</small> : <small>Choisissez une suggestion pour placer le bien et retrouver sa parcelle.</small>}
    </div>
  );
}
