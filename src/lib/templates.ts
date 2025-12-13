

export const SCHOOL_TEMPLATES = {
  IVORIAN_SYSTEM: {
    cycles: [
      { name: "Enseignement Préscolaire", code: "MAT", order: 1 },
      { name: "Enseignement Primaire", code: "PRI", order: 2 },
      { name: "Enseignement Secondaire - Premier Cycle", code: "COL", order: 3 },
      { name: "Enseignement Secondaire - Deuxième Cycle", code: "LYC", order: 4 },
      { name: "Enseignement Technique et Professionnel", code: "TECH", order: 5 },
    ],
    niveaux: {
      "Enseignement Préscolaire": ["Petite Section", "Moyenne Section", "Grande Section"],
      "Enseignement Primaire": ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"],
      "Enseignement Secondaire - Premier Cycle": ["6ème", "5ème", "4ème", "3ème"],
      "Enseignement Secondaire - Deuxième Cycle": ["Seconde", "Première", "Terminale"],
      "Enseignement Technique et Professionnel": ["CAP 1", "CAP 2", "BT 1", "BT 2", "BTS 1", "BTS 2"],
    },
    subjects: [
      { name: "Français", color: "#3B82F6" },
      { name: "Mathématiques", color: "#10B981" },
      { name: "Histoire-Géographie", color: "#F59E0B" },
      { name: "Sciences de la Vie et de la Terre (SVT)", color: "#22C55E" },
      { name: "Physique-Chimie", color: "#8B5CF6" },
      { name: "Anglais", color: "#EF4444" },
      { name: "EPS", color: "#6366F1" },
      { name: "Philosophie", color: "#8B5CF6" },
      { name: "Conduite", color: "#64748B" },
    ],
  },
  // Add other templates as needed
};
