/**
 * Données sources pour la rentrée 2026-2027 — Le Mini Monde.
 *
 * Construites par rapprochement (nom normalisé, tokens) entre :
 *   - le registre 2025-2026 déjà en base (scripts/data/paiements-2025-2026.js,
 *     source validée avec le client, 89 élèves sur 6 classes : Petite/Moyenne/
 *     Grande Section-A, CP1-A, CPU-A, CE1-A) ;
 *   - le nouveau registre 2026-2027 fourni par le client (COMPTABILITE_MINI_MONDE_2026-2027.xlsx,
 *     59 élèves sur 8 classes : TPS, PS, MS, GS, CPU, CP1, CE1, CE2).
 *
 * cyclesNiveaux : structure pédagogique à créer (idempotent — le script
 *   vérifie l'existence par nom avant de créer).
 *
 * classes : les 8 classes cibles 2026-2027 à créer (idempotent par nom+année).
 *
 * promotions : 25 élèves identifiés comme les MÊMES personnes entre les deux
 *   registres (nom identique ou quasi-identique + progression de niveau
 *   cohérente) — à faire passer dans leur nouvelle classe, PAS à réimporter.
 *   Inclut leurs montants de scolarité 2026-2027 (tuitionFee/amountDue/
 *   inscription/versement) à appliquer sur leur fiche existante.
 *
 * newStudents : 34 élèves du registre 2026-2027 sans correspondance dans le
 *   registre 2025-2026 — élèves réellement nouveaux, à créer.
 *
 * archive : 64 élèves du registre 2025-2026 sans correspondance dans le
 *   registre 2026-2027 — ne reviennent pas, à marquer "Radié" (réversible,
 *   restaurable depuis l'onglet Archives si un parent se présente plus tard).
 *
 * Tous les cas douteux (score de similarité < 1.0) ont été confirmés
 * manuellement avec le client avant la génération de ce fichier — ne pas
 * recalculer automatiquement en cas de ré-génération.
 */
module.exports = {
  "fromYear": "2025-2026",
  "toYear": "2026-2027",
  "cyclesNiveaux": [
    { "cycle": "Garderie", "cycleCode": "GAR", "cycleOrder": 1, "niveaux": [
      { "name": "TPS", "code": "TPS", "order": 1 }
    ] },
    { "cycle": "Préscolaire", "cycleCode": "PRE", "cycleOrder": 2, "niveaux": [
      { "name": "PS", "code": "PS", "order": 1 },
      { "name": "MS", "code": "MS", "order": 2 },
      { "name": "GS", "code": "GS", "order": 3 },
      { "name": "CPU", "code": "CPU", "order": 4 }
    ] },
    { "cycle": "Primaire", "cycleCode": "PRI", "cycleOrder": 3, "niveaux": [
      { "name": "CP1", "code": "CP1", "order": 1 },
      { "name": "CE1", "code": "CE1", "order": 2 },
      { "name": "CE2", "code": "CE2", "order": 3 }
    ] }
  ],
  "classes": [
    { "name": "TPS", "code": "TPS", "niveauName": "TPS", "maxStudents": 25 },
    { "name": "PS", "code": "PS", "niveauName": "PS", "maxStudents": 30 },
    { "name": "MS", "code": "MS", "niveauName": "MS", "maxStudents": 30 },
    { "name": "GS", "code": "GS", "niveauName": "GS", "maxStudents": 30 },
    { "name": "CPU", "code": "CPU", "niveauName": "CPU", "maxStudents": 25 },
    { "name": "CP1", "code": "CP1", "niveauName": "CP1", "maxStudents": 30 },
    { "name": "CE1", "code": "CE1", "niveauName": "CE1", "maxStudents": 30 },
    { "name": "CE2", "code": "CE2", "niveauName": "CE2", "maxStudents": 30 }
  ],
  "newStudents": [
    {
      "firstName": "ABRAHAM ETIENNE DOMINIQUE",
      "lastName": "KONAN",
      "gender": "M",
      "className": "TPS",
      "matricule": "MM2627-001",
      "tuitionFee": 260000,
      "amountDue": 200000,
      "inscription": 60000,
      "versement": 0
    },
    {
      "firstName": "HIRAM MAYDEN KONAN",
      "lastName": "KOUAKOU",
      "gender": "M",
      "className": "PS",
      "matricule": "MM2627-002",
      "tuitionFee": 234000,
      "amountDue": 117000,
      "inscription": 117000,
      "versement": 0
    },
    {
      "firstName": "STEVEN JACQUES EMMANUEL",
      "lastName": "KOFFI",
      "gender": "M",
      "className": "PS",
      "matricule": "MM2627-003",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "MAELYS JOANNA",
      "lastName": "KREGBE",
      "gender": "F",
      "className": "PS",
      "matricule": "MM2627-004",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "FAMIEN KENAN",
      "lastName": "LOUKOU",
      "gender": "M",
      "className": "PS",
      "matricule": "MM2627-005",
      "tuitionFee": 260000,
      "amountDue": 110000,
      "inscription": 150000,
      "versement": 0
    },
    {
      "firstName": "SOURALE PRINCE",
      "lastName": "KRA",
      "gender": "M",
      "className": "PS",
      "matricule": "MM2627-006",
      "tuitionFee": 260000,
      "amountDue": 0,
      "inscription": 260000,
      "versement": 0
    },
    {
      "firstName": "KONAN FAEL HIRAM",
      "lastName": "KOUAME",
      "gender": "M",
      "className": "PS",
      "matricule": "MM2627-007",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "KIMIA CLAIRE",
      "lastName": "LAFARGUE",
      "gender": "F",
      "className": "PS",
      "matricule": "MM2627-008",
      "tuitionFee": 260000,
      "amountDue": 0,
      "inscription": 260000,
      "versement": 0
    },
    {
      "firstName": "NAEL OUMAR OUSMANE",
      "lastName": "SANOGO",
      "gender": "M",
      "className": "PS",
      "matricule": "MM2627-009",
      "tuitionFee": 234000,
      "amountDue": 104000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "KURT EMMANUEL",
      "lastName": "DIALLO",
      "gender": "M",
      "className": "PS",
      "matricule": "MM2627-010",
      "tuitionFee": 234000,
      "amountDue": 104000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "MERAB",
      "lastName": "NANGNE",
      "gender": "F",
      "className": "PS",
      "matricule": "MM2627-011",
      "tuitionFee": 260000,
      "amountDue": 0,
      "inscription": 260000,
      "versement": 0
    },
    {
      "firstName": "HIKMA LYAD",
      "lastName": "DIARRASSOUBA",
      "gender": "F",
      "className": "PS",
      "matricule": "MM2627-012",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "JOYCE KAOUSSARA BORIBAGA",
      "lastName": "OUATTARA",
      "gender": "F",
      "className": "MS",
      "matricule": "MM2627-013",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "SOLEHI SAM EBENID",
      "lastName": "OUINGNA",
      "gender": "M",
      "className": "MS",
      "matricule": "MM2627-014",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "ZRAMPIE ENAYA",
      "lastName": "PEHE",
      "gender": "F",
      "className": "MS",
      "matricule": "MM2627-015",
      "tuitionFee": 234000,
      "amountDue": 117000,
      "inscription": 117000,
      "versement": 0
    },
    {
      "firstName": "MAELYS NAELLE DOUNIA",
      "lastName": "DOUMBIA",
      "gender": "F",
      "className": "MS",
      "matricule": "MM2627-016",
      "tuitionFee": 260000,
      "amountDue": 60000,
      "inscription": 200000,
      "versement": 0
    },
    {
      "firstName": "ELIE KYLIAN DEGBOEHLIN",
      "lastName": "KOUASSI",
      "gender": "M",
      "className": "GS",
      "matricule": "MM2627-017",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "AFFIA BOUAH VICTOIRE",
      "lastName": "KOFFI",
      "gender": "F",
      "className": "GS",
      "matricule": "MM2627-018",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "firstName": "ETHANE RAPHAEL",
      "lastName": "KOUAME",
      "gender": "M",
      "className": "CP1",
      "matricule": "MM2627-019",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "firstName": "AGOH PRUNELLE MARIE-CATHY",
      "lastName": "BALLY",
      "gender": "F",
      "className": "CP1",
      "matricule": "MM2627-020",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "firstName": "ANIKHAN MANELLE ILY",
      "lastName": "KOUAME",
      "gender": "F",
      "className": "CP1",
      "matricule": "MM2627-021",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "firstName": "N'GUELE ILARIA KEREN",
      "lastName": "N'GBOSSAN",
      "gender": "F",
      "className": "CP1",
      "matricule": "MM2627-022",
      "tuitionFee": 350000,
      "amountDue": 170000,
      "inscription": 180000,
      "versement": 0
    },
    {
      "firstName": "ARIEL KETSIA",
      "lastName": "GUISSA",
      "gender": "M",
      "className": "CP1",
      "matricule": "MM2627-023",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "firstName": "KEREN ESTHER CHRISTY",
      "lastName": "KOUAME",
      "gender": "F",
      "className": "CP1",
      "matricule": "MM2627-024",
      "tuitionFee": 315000,
      "amountDue": 215000,
      "inscription": 100000,
      "versement": 0
    },
    {
      "firstName": "AMENAN MAELYS KEREN",
      "lastName": "KONAN",
      "gender": "F",
      "className": "CPU",
      "matricule": "MM2627-025",
      "tuitionFee": 350000,
      "amountDue": 170000,
      "inscription": 180000,
      "versement": 0
    },
    {
      "firstName": "MOHAET KYMIA ANNE",
      "lastName": "KOUAKOU",
      "gender": "F",
      "className": "CPU",
      "matricule": "MM2627-026",
      "tuitionFee": 350000,
      "amountDue": 35000,
      "inscription": 200000,
      "versement": 115000
    },
    {
      "firstName": "KOSSOMINA FADILAH",
      "lastName": "OUATTARA",
      "gender": "F",
      "className": "CPU",
      "matricule": "MM2627-027",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "firstName": "KYLIAN EXAUCEE DESIRE",
      "lastName": "KOUKA",
      "gender": "M",
      "className": "CPU",
      "matricule": "MM2627-028",
      "tuitionFee": 350000,
      "amountDue": 200000,
      "inscription": 150000,
      "versement": 0
    },
    {
      "firstName": "KACOU BENY ELIJAH",
      "lastName": "AKA",
      "gender": "M",
      "className": "CPU",
      "matricule": "MM2627-029",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "firstName": "ALYA MIENSAH MARILYNE",
      "lastName": "DIALLO",
      "gender": "F",
      "className": "CPU",
      "matricule": "MM2627-030",
      "tuitionFee": 315000,
      "amountDue": 140000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "firstName": "MIENZRAMA BERYL CHANA",
      "lastName": "N'GUESSAN",
      "gender": "F",
      "className": "CE1",
      "matricule": "MM2627-031",
      "tuitionFee": 350000,
      "amountDue": 180000,
      "inscription": 170000,
      "versement": 0
    },
    {
      "firstName": "FAMIEN HANIEL DAVID",
      "lastName": "OUATTARA",
      "gender": "M",
      "className": "CE2",
      "matricule": "MM2627-032",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "firstName": "MOHAET KENAN",
      "lastName": "KOUAKOU",
      "gender": "M",
      "className": "CE2",
      "matricule": "MM2627-033",
      "tuitionFee": 315000,
      "amountDue": 0,
      "inscription": 315000,
      "versement": 0
    },
    {
      "firstName": "AUREL MATHIS EMMANUEL",
      "lastName": "KOUAME",
      "gender": "M",
      "className": "CE2",
      "matricule": "MM2627-034",
      "tuitionFee": 315000,
      "amountDue": 215000,
      "inscription": 100000,
      "versement": 0
    }
  ],
  "promotions": [
    {
      "fromClass": "Petite Section-A",
      "fromName": "IRA MOHAMED SHAEEN",
      "toClass": "MS",
      "toName": "IRA MOHAMED SHAEEN",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "fromClass": "Moyenne Section-A",
      "fromName": "OUATTARA SORAYA BINTOU",
      "toClass": "GS",
      "toName": "OUATTARA SORAYA BINTOU",
      "tuitionFee": 260000,
      "amountDue": 0,
      "inscription": 130000,
      "versement": 130000
    },
    {
      "fromClass": "Moyenne Section-A",
      "fromName": "ZEBIHI ETHAN LOIC",
      "toClass": "GS",
      "toName": "ZEBIHI ETHAN LOIC",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "fromClass": "Moyenne Section-A",
      "fromName": "ALLAH FAHOUNDI ELISHAMA",
      "toClass": "GS",
      "toName": "ALLAH FAHOUNDI ELISHAMA",
      "tuitionFee": 234000,
      "amountDue": 34000,
      "inscription": 200000,
      "versement": 0
    },
    {
      "fromClass": "Grande Section-A",
      "fromName": "KOUADIA JERIEL YORAM",
      "toClass": "CP1",
      "toName": "KOUADIA JERIEL YORAM",
      "tuitionFee": 315000,
      "amountDue": 155000,
      "inscription": 160000,
      "versement": 0
    },
    {
      "fromClass": "CPU-A",
      "fromName": "HOUPHOUET MIENOMAN ALVIN",
      "toClass": "CE1",
      "toName": "HOUPHOUET MIENOMAN ALVIN",
      "tuitionFee": 315000,
      "amountDue": 157500,
      "inscription": 157500,
      "versement": 0
    },
    {
      "fromClass": "CPU-A",
      "fromName": "KONAN OUSSOU LUNA NELSIA",
      "toClass": "CE1",
      "toName": "KONAN OUSSOU LUNA NELSIA",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "fromClass": "CE1-A",
      "fromName": "KOUADIA APO KENAELLE",
      "toClass": "CE2",
      "toName": "KOUADIA APO KENAELLE",
      "tuitionFee": 315000,
      "amountDue": 155000,
      "inscription": 160000,
      "versement": 0
    },
    {
      "fromClass": "CE1-A",
      "fromName": "ALLAH ATCHELO MERVEILLE",
      "toClass": "CE2",
      "toName": "ALLAH ATCHELO MERVEILLE",
      "tuitionFee": 315000,
      "amountDue": 115000,
      "inscription": 200000,
      "versement": 0
    },
    {
      "fromClass": "CE1-A",
      "fromName": "KEITA IBRAHIM KALIL",
      "toClass": "CE2",
      "toName": "KEITA KALIL IBRAHIM",
      "tuitionFee": 315000,
      "amountDue": 155000,
      "inscription": 160000,
      "versement": 0
    },
    {
      "fromClass": "CPU-A",
      "fromName": "HALA KAMISSA INAYA",
      "toClass": "CE1",
      "toName": "HALA INAYA KAMISSA",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "fromClass": "Grande Section-A",
      "fromName": "N'GUESSAN KEREN AKOUA GRACE",
      "toClass": "CPU",
      "toName": "N'GUESSAN KEREN AKOUA GRACE MERVEILLE",
      "tuitionFee": 315000,
      "amountDue": 140000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "fromClass": "CPU-A",
      "fromName": "PEHE ARLETTE TODO LAEL",
      "toClass": "CE1",
      "toName": "PEHE TODO LAEL ARLETTE",
      "tuitionFee": 315000,
      "amountDue": 141500,
      "inscription": 173500,
      "versement": 0
    },
    {
      "fromClass": "CE1-A",
      "fromName": "HOUPHOUET BERENICE FERIMA",
      "toClass": "CE2",
      "toName": "HOUPHOUET BERENICE FERIMA SIBELLE",
      "tuitionFee": 315000,
      "amountDue": 157500,
      "inscription": 157500,
      "versement": 0
    },
    {
      "fromClass": "CE1-A",
      "fromName": "KOUASSI MIENMAN MARIE PRUNELLE",
      "toClass": "CE2",
      "toName": "KOUASSI MARIE PRUNELLE",
      "tuitionFee": 315000,
      "amountDue": 155000,
      "inscription": 160000,
      "versement": 0
    },
    {
      "fromClass": "Moyenne Section-A",
      "fromName": "COULIBALY NADJANAYA",
      "toClass": "GS",
      "toName": "COULIBALY NADJANAYA ANGELA",
      "tuitionFee": 260000,
      "amountDue": 0,
      "inscription": 260000,
      "versement": 0
    },
    {
      "fromClass": "Moyenne Section-A",
      "fromName": "VANIE AYLAN ELIAKIM",
      "toClass": "GS",
      "toName": "VANIE ELIAKIM",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "fromClass": "Petite Section-A",
      "fromName": "SANGBE ADJOUA ASSENA",
      "toClass": "MS",
      "toName": "SANGBE ADJOUAH ASSENA",
      "tuitionFee": 234000,
      "amountDue": 104000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "fromClass": "CP1-A",
      "fromName": "DIOMANDE FADILA",
      "toClass": "CPU",
      "toName": "DIOMANDE AMINATA FADILA",
      "tuitionFee": 350000,
      "amountDue": 175000,
      "inscription": 175000,
      "versement": 0
    },
    {
      "fromClass": "Grande Section-A",
      "fromName": "AMONKOU SOHAHI YAEL",
      "toClass": "CP1",
      "toName": "AMONKOU YAEL",
      "tuitionFee": 350000,
      "amountDue": 260000,
      "inscription": 90000,
      "versement": 0
    },
    {
      "fromClass": "Moyenne Section-A",
      "fromName": "BAHIRO ASSENA BERENISSE",
      "toClass": "GS",
      "toName": "BAHIRO ASSENA BERENICE",
      "tuitionFee": 260000,
      "amountDue": 0,
      "inscription": 260000,
      "versement": 0
    },
    {
      "fromClass": "Moyenne Section-A",
      "fromName": "DOUON ROHI",
      "toClass": "GS",
      "toName": "DOUON ROHI RAPHAEL",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "fromClass": "Petite Section-A",
      "fromName": "GOHO BEHA YVES PHARELL SINANE",
      "toClass": "MS",
      "toName": "GOHO BEHA YVES PHAREL",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    },
    {
      "fromClass": "Moyenne Section-A",
      "fromName": "N'GUESSAN RAMISSOU",
      "toClass": "GS",
      "toName": "N'GUESSAN RAMISSOU CHRIS EVAN",
      "tuitionFee": 234000,
      "amountDue": 74000,
      "inscription": 160000,
      "versement": 0
    },
    {
      "fromClass": "Moyenne Section-A",
      "fromName": "KOUASSI N'GUESSAN KETH",
      "toClass": "GS",
      "toName": "KOUASSI N'GUESSAN KEYTH LYANNA",
      "tuitionFee": 260000,
      "amountDue": 130000,
      "inscription": 130000,
      "versement": 0
    }
  ],
  "archive": [
    {
      "classe": "Petite Section-A",
      "fullname": "ABOBI FRANçOIS NATHAN"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "AKA KOUASSI JEAN CHRISTIAN"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "BERTE KAKIN AYANNAH ABI"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "BERTE N'GADIO IYANNAH KADY"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "BROU SHILO JEAN HANNIEL"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "COULIBALY ALVIN CHRIS-FAVEUR"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "DIOP SOPHIETOU SULTAN"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "DJOUBISSE MARIA KEZIAH"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "DE LA CELLE MATHEW"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "GNYABRO ADOU MARIE PAULE"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "KOUASSI YEYOLE MANUELLA"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "MONNEY KELYA ANAIA MELODY"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "TIEMELE NHYIRA ESTHER"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "TANOH YAO DJAHA MARIE KIMBERLY"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "YOHOU CHRIS NATHAN"
    },
    {
      "classe": "Petite Section-A",
      "fullname": "KONAN KONAN NATHANAEL"
    },
    {
      "classe": "Moyenne Section-A",
      "fullname": "DJEDRI ANOUANZE ESTHER"
    },
    {
      "classe": "Moyenne Section-A",
      "fullname": "SO HELENA DARNELLE NALYA"
    },
    {
      "classe": "Moyenne Section-A",
      "fullname": "SANOU SHANIELLE LYNE"
    },
    {
      "classe": "Moyenne Section-A",
      "fullname": "FOFANA HAMAD MOUSSA"
    },
    {
      "classe": "Moyenne Section-A",
      "fullname": "QUENUM CHLOE LYNNA"
    },
    {
      "classe": "Moyenne Section-A",
      "fullname": "YAO EYOLI LYA DARNELLE"
    },
    {
      "classe": "Moyenne Section-A",
      "fullname": "BROU N'DJHI IRIS"
    },
    {
      "classe": "Moyenne Section-A",
      "fullname": "ETCHE IVY ANAELLE DAHLIA"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "AMANI STELLA MARIE FLORIANNE"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "ZOUZOUA ROLLO JOYCE"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "AYE LIAM M'BOUAFOUE"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "AKAKPO MERVIN RAYANNE"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "TRE MOMBLEA CANDICE NAELLE"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "ADOU KOUAKOU JOREL"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "DIOP KONAN ELI ABRAHAM"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "KIRIFO ADOM CHRIST YVAN"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "KOFFI ECLOI"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "ZOHIN GUEASSE PRIELLE"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "YAO KOUADIO LIX-EMMAUS"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "KOFFI AYA ELYANNA"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "KOUAKOU JEREMY"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "KOUAME KOUADIO KAYLA"
    },
    {
      "classe": "Grande Section-A",
      "fullname": "YAO KONAN ELISHAMA"
    },
    {
      "classe": "CP1-A",
      "fullname": "KOUAME JEAN PAVEL RAYAN"
    },
    {
      "classe": "CP1-A",
      "fullname": "N'GATTA MARIE STELLA MAELYA"
    },
    {
      "classe": "CP1-A",
      "fullname": "TRAORE ANGELO"
    },
    {
      "classe": "CP1-A",
      "fullname": "TRAORE KYLIAN SUCCES"
    },
    {
      "classe": "CP1-A",
      "fullname": "SORO YERIM"
    },
    {
      "classe": "CPU-A",
      "fullname": "KOUAME GNAMIENWA MARIE THERESE"
    },
    {
      "classe": "CPU-A",
      "fullname": "GUIROBO YBEYOU MARC DUVALL"
    },
    {
      "classe": "CPU-A",
      "fullname": "KOUADIO MIENSAH BERAKA YONAH"
    },
    {
      "classe": "CPU-A",
      "fullname": "KOIVOGUI NANTEH KHALIDA BINI"
    },
    {
      "classe": "CPU-A",
      "fullname": "KOUAKOU MAYANA YONA"
    },
    {
      "classe": "CPU-A",
      "fullname": "DE LACELLE HANNAH"
    },
    {
      "classe": "CPU-A",
      "fullname": "DIABATE KATCHINNIN AYANOA"
    },
    {
      "classe": "CPU-A",
      "fullname": "DJEDRI MOAYEDAN LYDIE AMOUR"
    },
    {
      "classe": "CPU-A",
      "fullname": "EHOUMAN ANOH MARDOCHEE"
    },
    {
      "classe": "CPU-A",
      "fullname": "KOUADIO KYLIAN FIACRE"
    },
    {
      "classe": "CPU-A",
      "fullname": "KONE BINTOU MAELLE MADIRHA"
    },
    {
      "classe": "CPU-A",
      "fullname": "KOUAME SOURALE ANAIS"
    },
    {
      "classe": "CPU-A",
      "fullname": "OKA ELIAKIM WALID"
    },
    {
      "classe": "CPU-A",
      "fullname": "N'GUESSAN AKISSI ELVIRA"
    },
    {
      "classe": "CPU-A",
      "fullname": "VALET AZOLET MARY-LYHIA"
    },
    {
      "classe": "CE1-A",
      "fullname": "KOIVOGUI KINOUKLAN KAIS AHMAD"
    },
    {
      "classe": "CE1-A",
      "fullname": "N'GOUANDI N'CHIRA CHEDNA"
    },
    {
      "classe": "CE1-A",
      "fullname": "KOFFI ILYANA PAULE-MAUREEN"
    },
    {
      "classe": "CE1-A",
      "fullname": "MELESS EMLYS YOU RUTH"
    },
    {
      "classe": "CE1-A",
      "fullname": "KOUAME BOUEDOU MYRACLE"
    }
  ]
};
