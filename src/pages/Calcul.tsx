import { useEffect, useMemo, useState } from 'react';
import { ChampChoix, ChampNombre } from '../composants/Champs';
import { IcRetour } from '../composants/Icones';
import { aller, useDonnees } from '../contexte';
import { alerteDPE, calculer, ENTREES_DEFAUT, euros, pct, PRESETS_FRAIS, prixAchatMaximal } from '../lib/calculs';
import type { EntreesCalcul } from '../types';

type Cle = keyof EntreesCalcul;

export function PageCalcul({ bienId }: { bienId?: string }) {
  const { biens, enregistrerBien, notifier } = useDonnees();
  const bien = bienId ? biens.find((b) => b.id === bienId) : undefined;
  const [e, setE] = useState<EntreesCalcul>(bien?.calcul ?? { ...ENTREES_DEFAUT, prixAchat: bien?.prixAffiche ?? ENTREES_DEFAUT.prixAchat });
  const [modifie, setModifie] = useState(false);

  // Changement de bien (ou bien chargé après le premier rendu) : on reprend ses valeurs.
  useEffect(() => {
    if (!bien) return;
    setE(bien.calcul ?? { ...ENTREES_DEFAUT, prixAchat: bien.prixAffiche ?? ENTREES_DEFAUT.prixAchat });
    setModifie(!bien.calcul);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bien?.id]);

  const champ = (cle: Cle) => (v: number | undefined) => {
    setModifie(true);
    setE((x) => ({ ...x, [cle]: v ?? 0 }));
  };
  const n = (cle: Cle, libelle: string, unite = '€', aide?: string) => (
    <ChampNombre libelle={libelle} valeur={e[cle] as number} onChange={champ(cle)} unite={unite} aide={aide} />
  );

  const r = useMemo(() => calculer(e), [e]);
  const offreMax = useMemo(() => prixAchatMaximal(e), [e]);
  const alerte = alerteDPE(bien?.dpe);
  const ton = r.margeNettePct >= e.margeCiblePct ? 'bon' : r.margeNettePct >= e.margeCiblePct / 2 ? 'moyen' : 'mauvais';

  const enregistrer = () => {
    if (!bien) return;
    enregistrerBien({ ...bien, calcul: e });
    setModifie(false);
    notifier('Chiffrage enregistré dans la fiche');
  };

  return (
    <div className="pile">
      <div className="titre-page">
        <div>
          {bien && <a className="bouton petit" href={`#/biens/${bien.id}`} style={{ marginBottom: 10 }}><IcRetour /> {bien.titre || 'Fiche du bien'}</a>}
          <h1>Chiffrer une opération</h1>
          <p className="discret">Ce que l’opération coûte vraiment, ce qu’elle rapporte, et le prix à ne pas dépasser.</p>
        </div>
        <div className="barre-boutons">
          <ChampChoix
            libelle="Bien"
            valeur={bien?.id ?? ''}
            options={biens.map((b) => ({ valeur: b.id, libelle: b.titre || b.adresse || 'Bien sans nom' }))}
            vide="Calcul libre"
            onChange={(id) => aller(id ? `calcul?bien=${id}` : 'calcul')}
          />
          {bien && <button className="bouton principal" onClick={enregistrer} disabled={!modifie} style={{ alignSelf: 'end' }}>{modifie ? 'Enregistrer dans la fiche' : 'Enregistré'}</button>}
        </div>
      </div>

      <div className="grille-calc">
        <section className="panneau">
          <fieldset>
            <legend>Achat</legend>
            <div className="grille-champs">
              {n('prixAchat', 'Prix d’achat ou adjudication')}
              {n('fraisAcquisitionPct', 'Frais d’acquisition', '%')}
              {n('fraisAnnexes', 'Frais annexes', '€', 'Géomètre, avocat, diagnostics…')}
            </div>
            <div className="presets">
              {PRESETS_FRAIS.map((p) => (
                <button key={p.libelle} type="button" className="bouton petit" title={p.aide} aria-pressed={e.fraisAcquisitionPct === p.pct} onClick={() => champ('fraisAcquisitionPct')(p.pct)}>
                  {p.libelle} ({p.pct} %)
                </button>
              ))}
            </div>
            <p className="petit discret" style={{ marginTop: 8 }}>{PRESETS_FRAIS.find((p) => p.pct === e.fraisAcquisitionPct)?.aide ?? 'Pourcentage du prix d’achat.'}</p>
          </fieldset>

          <fieldset>
            <legend>Travaux et portage</legend>
            <div className="grille-champs">
              {n('travaux', 'Travaux (devis)')}
              {n('imprevusPct', 'Marge pour imprévus', '%', 'Prévoir 15 à 25 % dans l’ancien')}
              {n('dureePortageMois', 'Durée avant revente', 'mois')}
              {n('taxeFonciereAn', 'Taxe foncière', '€/an')}
              {n('chargesMois', 'Assurance, énergie…', '€/mois')}
            </div>
          </fieldset>

          <fieldset>
            <legend>Financement</legend>
            <div className="grille-champs">
              {n('apport', 'Apport personnel')}
              {n('tauxCreditPct', 'Taux du crédit', '%')}
              {n('dureeCreditAns', 'Durée du crédit', 'ans')}
              {n('fraisCredit', 'Frais de dossier et garantie')}
            </div>
          </fieldset>

          <fieldset>
            <legend>Revente</legend>
            <div className="grille-champs">
              {n('prixRevente', 'Prix de revente estimé', '€', 'Comparez avec les ventes réelles (DVF)')}
              {n('fraisVentePct', 'Frais de vente', '%', 'Agence, diagnostics')}
              <ChampChoix
                libelle="Fiscalité"
                valeur={e.regimeFiscal}
                options={[{ valeur: 'particulier', libelle: 'Plus-value de particulier' }, { valeur: 'personnalise', libelle: 'Taux personnalisé' }]}
                onChange={(v) => { setModifie(true); setE((x) => ({ ...x, regimeFiscal: v })); }}
                aide={e.regimeFiscal === 'particulier' ? 'Résidence secondaire ou locative. Résidence principale : exonérée.' : 'Ex. marchand de biens, société'}
              />
              {e.regimeFiscal === 'personnalise' && n('tauxPersonnalisePct', 'Taux sur la marge', '%')}
              {n('margeCiblePct', 'Marge nette visée', '%')}
            </div>
          </fieldset>

          <fieldset>
            <legend>Location</legend>
            <div className="grille-champs">
              {n('loyerMois', 'Loyer hors charges', '€/mois')}
              {n('vacanceMoisAn', 'Vacance', 'mois/an')}
              {n('chargesNonRecupAn', 'Charges non récupérables', '€/an')}
              {n('assurancePnoAn', 'Assurance propriétaire', '€/an')}
              {n('gestionPct', 'Gestion locative', '%')}
            </div>
          </fieldset>
        </section>

        <aside className="resultats" aria-label="Résultats">
          <div className={`verdict ${ton}`}>
            <small>Marge nette si vous revendez après {e.dureePortageMois} mois</small>
            <b className="nombre">{euros(r.margeNette)}</b>
            <span>
              soit {pct(r.margeNettePct)} de la somme investie
              {r.rendementFondsPropresPct !== undefined && <>, {pct(r.rendementFondsPropresPct, 0)} de votre apport</>}
            </span>
          </div>

          <section className="panneau">
            <h3>Le détail</h3>
            <table className="tableau-chiffres">
              <tbody>
                <tr><td>Prix d’achat</td><td>{euros(e.prixAchat)}</td></tr>
                <tr><td>Frais d’acquisition et annexes</td><td>{euros(r.fraisAcquisition + e.fraisAnnexes)}</td></tr>
                <tr><td>Travaux avec imprévus</td><td>{euros(r.travauxAvecImprevus)}</td></tr>
                <tr><td>Frais de crédit</td><td>{euros(e.fraisCredit)}</td></tr>
                <tr className="total"><td>Coût de revient</td><td>{euros(r.coutRevient)}</td></tr>
                <tr><td>Montant emprunté</td><td>{euros(r.emprunt)}</td></tr>
                <tr><td>Intérêts pendant le portage</td><td>{euros(r.interetsPortage)}</td></tr>
                <tr><td>Taxe foncière et charges</td><td>{euros(r.fraisPortage)}</td></tr>
                <tr><td>Prix de revente net de frais</td><td>{euros(r.prixReventeNet)}</td></tr>
                <tr className="total"><td>Marge avant impôt</td><td>{euros(r.margeAvantImpot)}</td></tr>
                <tr><td>Impôt estimé</td><td>{euros(r.impot)}</td></tr>
              </tbody>
            </table>
            {r.detailPlusValue && r.detailPlusValue.plusValueBrute > 0 && (
              <p className="petit discret" style={{ marginTop: 8 }}>
                Plus-value imposable {euros(r.detailPlusValue.plusValueBrute)} : impôt 19 % {euros(r.detailPlusValue.impotIR)}, prélèvements sociaux 17,2 % {euros(r.detailPlusValue.prelevementsSociaux)}
                {r.detailPlusValue.surtaxe > 0 && <>, surtaxe {euros(r.detailPlusValue.surtaxe)}</>}. Abattements pour durée de détention à partir de 6 ans.
              </p>
            )}
          </section>

          <div className="offre-max">
            <span className="petit">Prix d’achat maximal pour {pct(e.margeCiblePct, 0)} de marge nette</span>
            <b className="nombre">{offreMax > 0 ? euros(offreMax) : 'Inatteignable'}</b>
            <span className="petit discret">
              {offreMax > 0
                ? 'C’est votre limite pour une offre ou lors des enchères, frais en plus.'
                : 'Même à prix nul, la marge visée n’est pas atteinte : revoyez les travaux ou le prix de revente.'}
            </span>
          </div>

          <section className="panneau" style={{ marginTop: 16 }}>
            <h3>Si vous louez</h3>
            <table className="tableau-chiffres">
              <tbody>
                <tr><td>Rendement brut</td><td>{pct(r.rendementBrutPct)}</td></tr>
                <tr><td>Rendement net de charges</td><td>{pct(r.rendementNetPct)}</td></tr>
                <tr><td>Mensualité du crédit</td><td>{euros(r.mensualite)}</td></tr>
                <tr className="total"><td>Cash-flow mensuel avant impôt</td><td style={{ color: r.cashflowMensuel >= 0 ? 'var(--vigne)' : 'var(--gres)' }}>{euros(r.cashflowMensuel)}</td></tr>
              </tbody>
            </table>
            {bien && alerte && <div className={`alerte ${alerte.niveau}`} style={{ marginTop: 12 }}>{alerte.message}</div>}
          </section>

          <p className="avertissement">
            Estimations indicatives. La fiscalité réelle dépend de votre situation : faites valider l’opération par un notaire
            ou un conseiller avant de vous engager.
          </p>
        </aside>
      </div>
    </div>
  );
}
