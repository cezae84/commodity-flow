/** How far a fact reaches: it may describe the corridor itself or only one end of it. */
export const SCOPES = {
  corridor: { label: 'This corridor', hint: 'Figure for this origin–destination flow' },
  exporter: { label: 'Exporter', hint: 'Figure for the exporting country as a whole' },
  importer: { label: 'Importer', hint: 'Figure for the importing country as a whole' },
  chokepoint: { label: 'Chokepoint', hint: 'Figure for a strait or canal on the route' },
  market: { label: 'Market', hint: 'Figure for the global market' },
  status: { label: 'Status', hint: 'Evidence for the operational status' },
  policy: { label: 'Policy', hint: 'Regulation, quota or export control' },
  infrastructure: { label: 'Infrastructure', hint: 'Port, terminal, pipeline or capacity' },
};
