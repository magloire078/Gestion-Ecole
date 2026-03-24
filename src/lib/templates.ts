
import type { CountryCode } from './countries-data';

export interface SchoolTemplate {
  cycles: { name: string; code: string; order: number }[];
  niveaux: Record<string, string[]>;
  subjects: { name: string; color: string }[];
}

// ═══════════════════════════════════════════════════════
// Matières communes aux systèmes francophones
// ═══════════════════════════════════════════════════════
const COMMON_FRANCOPHONE_SUBJECTS = [
  { name: "Français", color: "#3B82F6" },
  { name: "Mathématiques", color: "#10B981" },
  { name: "Histoire-Géographie", color: "#F59E0B" },
  { name: "Sciences de la Vie et de la Terre (SVT)", color: "#22C55E" },
  { name: "Physique-Chimie", color: "#8B5CF6" },
  { name: "Anglais", color: "#EF4444" },
  { name: "EPS", color: "#6366F1" },
  { name: "Philosophie", color: "#8B5CF6" },
  { name: "Conduite", color: "#64748B" },
];

// ═══════════════════════════════════════════════════════
// TEMPLATES PAR SYSTÈME ÉDUCATIF
// ═══════════════════════════════════════════════════════

export const SCHOOL_TEMPLATES: Record<string, SchoolTemplate> = {
  // ─────────────────────────────────────────────────────
  // CÔTE D'IVOIRE
  // ─────────────────────────────────────────────────────
  IVORIAN_SYSTEM: {
    cycles: [
      { name: "Enseignement Préscolaire", code: "MAT", order: 1 },
      { name: "Enseignement Primaire", code: "PRI", order: 2 },
      { name: "Enseignement Secondaire - Premier Cycle (Collège)", code: "COL", order: 3 },
      { name: "Enseignement Secondaire - Deuxième Cycle (Lycée)", code: "LYC", order: 4 },
      { name: "Enseignement Technique et Professionnel (BT)", code: "ETP", order: 5 },
      { name: "Enseignement Supérieur (BTS)", code: "SUP", order: 6 },
    ],
    niveaux: {
      "Enseignement Préscolaire": ["Petite Section", "Moyenne Section", "Grande Section"],
      "Enseignement Primaire": ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"],
      "Enseignement Secondaire - Premier Cycle (Collège)": ["6ème", "5ème", "4ème", "3ème"],
      "Enseignement Secondaire - Deuxième Cycle (Lycée)": ["Seconde A", "Seconde C", "Première A", "Première C", "Première D", "Terminale A", "Terminale C", "Terminale D"],
      "Enseignement Technique et Professionnel (BT)": [
        "BT Dessin Bâtiment", "BT Génie Civil",
        "F1 (Construction Mécanique)", "F2 (Électronique)", "F3 (Électrotechnique)", "F4 (Génie Civil)",
        "G1 (Techniques Administratives)", "G2 (Techniques Quantitatives de Gestion)",
      ],
      "Enseignement Supérieur (BTS)": [
        "BTS Informatique Développeur d'Application", "BTS Finances Comptabilité et Gestion",
        "BTS Gestion Commerciale", "BTS Ressources Humaines et Communication"
      ],
    },
    subjects: COMMON_FRANCOPHONE_SUBJECTS,
  },

  // ─────────────────────────────────────────────────────
  // AFRIQUE DE L'OUEST FRANCOPHONE (SN, ML, BF, GN, TG, BJ, NE)
  // Système très similaire à la CI
  // ─────────────────────────────────────────────────────
  FRANCOPHONE_WEST_AFRICA: {
    cycles: [
      { name: "Préscolaire", code: "PRE", order: 1 },
      { name: "Élémentaire (Primaire)", code: "PRI", order: 2 },
      { name: "Moyen (Collège)", code: "COL", order: 3 },
      { name: "Secondaire (Lycée)", code: "LYC", order: 4 },
    ],
    niveaux: {
      "Préscolaire": ["Petite Section", "Moyenne Section", "Grande Section"],
      "Élémentaire (Primaire)": ["CI (CP1)", "CP (CP2)", "CE1", "CE2", "CM1", "CM2"],
      "Moyen (Collège)": ["6ème", "5ème", "4ème", "3ème"],
      "Secondaire (Lycée)": ["Seconde", "Première L", "Première S", "Terminale L", "Terminale S"],
    },
    subjects: COMMON_FRANCOPHONE_SUBJECTS,
  },

  // ─────────────────────────────────────────────────────
  // CAMEROUN (système francophone)
  // ─────────────────────────────────────────────────────
  CAMEROON_FRANCOPHONE: {
    cycles: [
      { name: "Maternelle", code: "MAT", order: 1 },
      { name: "Primaire", code: "PRI", order: 2 },
      { name: "Premier Cycle Secondaire", code: "COL", order: 3 },
      { name: "Second Cycle Secondaire", code: "LYC", order: 4 },
      { name: "Enseignement Technique", code: "TEC", order: 5 },
    ],
    niveaux: {
      "Maternelle": ["Petite Section", "Moyenne Section", "Grande Section"],
      "Primaire": ["SIL", "CP", "CE1", "CE2", "CM1", "CM2"],
      "Premier Cycle Secondaire": ["6ème", "5ème", "4ème", "3ème"],
      "Second Cycle Secondaire": ["Seconde A", "Seconde C", "Première A", "Première C", "Première D", "Terminale A", "Terminale C", "Terminale D"],
      "Enseignement Technique": [
        "Seconde Technique", "Première Technique",
        "Terminale F1", "Terminale F2", "Terminale F3", "Terminale F4",
        "Terminale G1", "Terminale G2", "Terminale G3",
      ],
    },
    subjects: [
      ...COMMON_FRANCOPHONE_SUBJECTS,
      { name: "Informatique", color: "#06B6D4" },
      { name: "Éducation à la Citoyenneté", color: "#84CC16" },
    ],
  },

  // ─────────────────────────────────────────────────────
  // AFRIQUE CENTRALE FRANCOPHONE (GA, CG, TD, CD)
  // ─────────────────────────────────────────────────────
  FRANCOPHONE_CENTRAL_AFRICA: {
    cycles: [
      { name: "Préscolaire", code: "PRE", order: 1 },
      { name: "Primaire", code: "PRI", order: 2 },
      { name: "Collège (Secondaire 1er cycle)", code: "COL", order: 3 },
      { name: "Lycée (Secondaire 2nd cycle)", code: "LYC", order: 4 },
    ],
    niveaux: {
      "Préscolaire": ["Petite Section", "Moyenne Section", "Grande Section"],
      "Primaire": ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"],
      "Collège (Secondaire 1er cycle)": ["6ème", "5ème", "4ème", "3ème"],
      "Lycée (Secondaire 2nd cycle)": ["Seconde", "Première A", "Première C", "Première D", "Terminale A", "Terminale C", "Terminale D"],
    },
    subjects: COMMON_FRANCOPHONE_SUBJECTS,
  },

  // ─────────────────────────────────────────────────────
  // MADAGASCAR
  // ─────────────────────────────────────────────────────
  MADAGASCAR_SYSTEM: {
    cycles: [
      { name: "Préscolaire", code: "PRE", order: 1 },
      { name: "Primaire (EPP)", code: "PRI", order: 2 },
      { name: "Collège (CEG)", code: "COL", order: 3 },
      { name: "Lycée", code: "LYC", order: 4 },
    ],
    niveaux: {
      "Préscolaire": ["Petite Section", "Moyenne Section", "Grande Section"],
      "Primaire (EPP)": ["T1 (CP1)", "T2 (CP2)", "T3 (CE)", "T4 (CM1)", "T5 (CM2)"],
      "Collège (CEG)": ["6ème", "5ème", "4ème", "3ème"],
      "Lycée": ["Seconde", "Première A", "Première C", "Première D", "Terminale A", "Terminale C", "Terminale D"],
    },
    subjects: [
      { name: "Malagasy", color: "#059669" },
      { name: "Français", color: "#3B82F6" },
      { name: "Mathématiques", color: "#10B981" },
      { name: "Histoire-Géographie", color: "#F59E0B" },
      { name: "Sciences Physiques", color: "#8B5CF6" },
      { name: "Sciences Naturelles", color: "#22C55E" },
      { name: "Anglais", color: "#EF4444" },
      { name: "EPS", color: "#6366F1" },
      { name: "Philosophie", color: "#8B5CF6" },
    ],
  },

  // ─────────────────────────────────────────────────────
  // HAÏTI
  // ─────────────────────────────────────────────────────
  HAITI_SYSTEM: {
    cycles: [
      { name: "Préscolaire", code: "PRE", order: 1 },
      { name: "Fondamental 1er Cycle", code: "FD1", order: 2 },
      { name: "Fondamental 2ème Cycle", code: "FD2", order: 3 },
      { name: "Fondamental 3ème Cycle", code: "FD3", order: 4 },
      { name: "Secondaire (Nouveau Secondaire)", code: "SEC", order: 5 },
    ],
    niveaux: {
      "Préscolaire": ["1ère Année Préscolaire", "2ème Année Préscolaire", "3ème Année Préscolaire"],
      "Fondamental 1er Cycle": ["1ère AF", "2ème AF"],
      "Fondamental 2ème Cycle": ["3ème AF", "4ème AF"],
      "Fondamental 3ème Cycle": ["5ème AF", "6ème AF", "7ème AF", "8ème AF", "9ème AF"],
      "Secondaire (Nouveau Secondaire)": ["NS1", "NS2", "NS3", "NS4"],
    },
    subjects: [
      { name: "Créole", color: "#059669" },
      { name: "Français", color: "#3B82F6" },
      { name: "Mathématiques", color: "#10B981" },
      { name: "Sciences Sociales", color: "#F59E0B" },
      { name: "Sciences Expérimentales", color: "#22C55E" },
      { name: "Anglais", color: "#EF4444" },
      { name: "Espagnol", color: "#F97316" },
      { name: "EPS", color: "#6366F1" },
    ],
  },

  // ─────────────────────────────────────────────────────
  // FRANCE
  // ─────────────────────────────────────────────────────
  FRANCE_SYSTEM: {
    cycles: [
      { name: "Maternelle", code: "MAT", order: 1 },
      { name: "Élémentaire", code: "ELE", order: 2 },
      { name: "Collège", code: "COL", order: 3 },
      { name: "Lycée Général", code: "LYC", order: 4 },
    ],
    niveaux: {
      "Maternelle": ["Petite Section", "Moyenne Section", "Grande Section"],
      "Élémentaire": ["CP", "CE1", "CE2", "CM1", "CM2"],
      "Collège": ["6ème", "5ème", "4ème", "3ème"],
      "Lycée Général": ["Seconde Générale", "Première Générale", "Terminale Générale"],
    },
    subjects: [
      { name: "Français", color: "#3B82F6" },
      { name: "Mathématiques", color: "#10B981" },
      { name: "Histoire-Géographie", color: "#F59E0B" },
      { name: "SVT", color: "#22C55E" },
      { name: "Physique-Chimie", color: "#8B5CF6" },
      { name: "Anglais", color: "#EF4444" },
      { name: "Espagnol", color: "#F97316" },
      { name: "EPS", color: "#6366F1" },
      { name: "SES", color: "#EC4899" },
      { name: "Philosophie", color: "#8B5CF6" },
    ],
  },
};

/**
 * Get the appropriate template for a given country code.
 * Falls back to FRANCOPHONE_WEST_AFRICA if no specific template is found.
 */
export function getTemplateForCountry(countryCode: CountryCode): SchoolTemplate {
  const templateMap: Record<string, string> = {
    CI: 'IVORIAN_SYSTEM',
    SN: 'FRANCOPHONE_WEST_AFRICA',
    ML: 'FRANCOPHONE_WEST_AFRICA',
    BF: 'FRANCOPHONE_WEST_AFRICA',
    GN: 'FRANCOPHONE_WEST_AFRICA',
    TG: 'FRANCOPHONE_WEST_AFRICA',
    BJ: 'FRANCOPHONE_WEST_AFRICA',
    NE: 'FRANCOPHONE_WEST_AFRICA',
    CM: 'CAMEROON_FRANCOPHONE',
    GA: 'FRANCOPHONE_CENTRAL_AFRICA',
    CG: 'FRANCOPHONE_CENTRAL_AFRICA',
    TD: 'FRANCOPHONE_CENTRAL_AFRICA',
    CD: 'FRANCOPHONE_CENTRAL_AFRICA',
    MG: 'MADAGASCAR_SYSTEM',
    HT: 'HAITI_SYSTEM',
    FR: 'FRANCE_SYSTEM',
  };

  const key = templateMap[countryCode] || 'FRANCOPHONE_WEST_AFRICA';
  return SCHOOL_TEMPLATES[key];
}

/** Get the display name for a template */
export function getTemplateDisplayName(countryCode: CountryCode): string {
  const names: Record<string, string> = {
    CI: 'Système Éducatif Ivoirien',
    SN: 'Système Éducatif Sénégalais',
    ML: 'Système Éducatif Malien',
    BF: 'Système Éducatif Burkinabè',
    GN: 'Système Éducatif Guinéen',
    TG: 'Système Éducatif Togolais',
    BJ: 'Système Éducatif Béninois',
    NE: 'Système Éducatif Nigérien',
    CM: 'Système Éducatif Camerounais (Francophone)',
    GA: 'Système Éducatif Gabonais',
    CG: 'Système Éducatif Congolais',
    TD: 'Système Éducatif Tchadien',
    CD: 'Système Éducatif de la RDC',
    MG: 'Système Éducatif Malgache',
    HT: 'Système Éducatif Haïtien',
    FR: 'Système Éducatif Français',
  };
  return names[countryCode] || 'Système Éducatif Francophone';
}
