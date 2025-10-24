// Shared region constants for the SLAM25 project
// Used by participants, teams, and other entities

export const ALLOWED_REGIONS = [
  'Bayern',
  'Baden-Württemberg',
  'Berlin-Brandenburg',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen/Bremen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
  'Liechtenstein',
  'Luxemburg',
  'Österreich',
  'Ostbelgien',
  'Schweiz',
  'Südtirol',
  'Slam Alphas',
  'BiPOC/Migra',
  'i,Slam',
  'TINte',
  'U20',
  'Chemnitz'
];

// Helper function to get region options for select components
export const getRegionOptions = (includeEmpty = true) => {
  const options = ALLOWED_REGIONS.map(region => ({ 
    value: region, 
    label: region 
  }));
  
  if (includeEmpty) {
    return [
      { value: '', label: 'Bundesland/Region auswählen' },
      ...options
    ];
  }
  
  return options;
};

// Validation helper
export const isValidRegion = (region) => {
  return ALLOWED_REGIONS.includes(region);
};
