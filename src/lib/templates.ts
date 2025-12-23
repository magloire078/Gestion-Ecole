
export const SCHOOL_TEMPLATES = {
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
        "BT Dessin Bâtiment", 
        "BT Génie Civil", 
        "F1 (Construction Mécanique)", 
        "F2 (Électronique)", 
        "F3 (Électrotechnique)", 
        "F4 (Génie Civil)",
        "G1 (Techniques Administratives)",
        "G2 (Techniques Quantitatives de Gestion)",
      ],
       "Enseignement Supérieur (BTS)": [
        "BTS Informatique Développeur d'Application", 
        "BTS Finances Comptabilité et Gestion", 
        "BTS Gestion Commerciale",
        "BTS Ressources Humaines et Communication"
      ],
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
