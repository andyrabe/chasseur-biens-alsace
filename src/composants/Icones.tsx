// Icônes au trait, dessinées pour l'appli.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true };

export const IcAccueil = () => (<svg {...base}><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" /></svg>);
export const IcBiens = () => (<svg {...base}><path d="M3 9.5 9 4l12 3-2 12-11 1z" /><path d="m9 4 2 9 8 6M11 13l-3 7" /></svg>);
export const IcAnnonces = () => (<svg {...base}><path d="m14 4 6 6M11 7l6 6M4 20l7-7M9.5 5.5l9 9-2.5 2.5-9-9z" /><path d="M3 21h8" /></svg>);
export const IcCalcul = () => (<svg {...base}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" /></svg>);
export const IcCourrier = () => (<svg {...base}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6 8.5 7 8.5-7" /></svg>);
export const IcReglages = () => (<svg {...base}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>);
export const IcPlus = () => (<svg {...base}><path d="M12 5v14M5 12h14" /></svg>);
export const IcMaison = () => (<svg {...base}><path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></svg>);
export const IcPdf = () => (<svg {...base}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>);
export const IcImprimer = () => (<svg {...base}><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><rect x="7" y="14" width="10" height="7" /></svg>);
export const IcCopier = () => (<svg {...base}><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>);
export const IcCible = () => (<svg {...base}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>);
export const IcRetour = () => (<svg {...base}><path d="M15 18 9 12l6-6" /></svg>);
