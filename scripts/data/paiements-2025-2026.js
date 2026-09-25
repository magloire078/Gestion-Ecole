/**
 * Données sources (tableaux Excel/papier fournis par le client) pour l'import
 * des paiements de scolarité 2025-2026 — Le Mini Monde.
 *
 * Une seule source de vérité par classe : le tableau détaillé par échéance
 * (Inscription / 1er / 2e / 3e / 4e versement). Le tableau récapitulatif
 * global fourni séparément n'a PAS été utilisé ici car confirmé obsolète
 * par le client sur au moins un cas (BROU SHILO JEAN HANNIEL).
 *
 * Champs par élève :
 *   name   : "NOM ET PRENOM(S)" tel qu'écrit dans le tableau (utilisé pour
 *            le rapprochement avec les élèves déjà en base, PAS pour écrire
 *            quoi que ce soit sur la fiche élève).
 *   total  : SCOLARITE TOTALE annoncée sur la ligne (informatif / contrôle).
 *   insc, v1, v2, v3, v4 : montants des colonnes INSCRIPTION / 1ER..4E
 *            VERSEMENT. `null` = cellule vide (aucun paiement sur cette
 *            échéance). v4 peut être une chaîne "A+B" quand la cellule
 *            contenait deux montants (ex: "30000+20000") — le script les
 *            traite comme deux paiements distincts.
 *   reste  : RESTE annoncé sur la ligne, pour contrôle croisé uniquement
 *            (0 si "-", null si la cellule était vide, nombre sinon). Ce
 *            champ n'est jamais écrit tel quel : le script recalcule
 *            toujours `total - somme(versements)` et compare.
 *
 * declaredTotals (optionnel, par classe) : ligne "TOTAL" du tableau source
 * quand elle existe, pour vérifier que la somme des colonnes retranscrites
 * correspond bien à ce que le document original annonçait.
 */
module.exports = {
  academicYear: '2025-2026',
  // Ordre confirmé par le client (croissant, PS -> CE1).
  classOrder: [
    'Petite Section-A',
    'Moyenne Section-A',
    'Grande Section-A',
    'CP1-A',
    'CPU-A',
    'CE1-A',
  ],
  classes: [
    {
      className: 'Petite Section-A',
      students: [
        { name: 'ABOBI FRANçOIS NATHAN', total: 260000, insc: 65000, v1: 65000, v2: 65000, v3: 65000, v4: null, reste: 0 },
        { name: 'AKA KOUASSI JEAN CHRISTIAN', total: 100000, insc: null, v1: null, v2: null, v3: null, v4: null, reste: 100000 },
        { name: "BERTE KAKIN AYANNAH ABI", total: 234000, insc: 30000, v1: 204000, v2: null, v3: null, v4: null, reste: 0 },
        { name: "BERTE N'GADIO IYANNAH KADY", total: 234000, insc: 130000, v1: 104000, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'BROU SHILO JEAN HANNIEL', total: 260000, insc: 30000, v1: 100000, v2: 30000, v3: 50000, v4: null, reste: 50000 },
        { name: 'COULIBALY ALVIN CHRIS-FAVEUR', total: 260000, insc: 30000, v1: 100000, v2: 70000, v3: 60000, v4: null, reste: null },
        { name: 'DIOP SOPHIETOU SULTAN', total: 260000, insc: 30000, v1: 130000, v2: 50000, v3: 50000, v4: null, reste: 0 },
        { name: 'DJOUBISSE MARIA KEZIAH', total: 234000, insc: 70000, v1: 60000, v2: 104000, v3: null, v4: null, reste: 0 },
        { name: 'DE LA CELLE MATHEW', total: 234000, insc: 160000, v1: 15000, v2: null, v3: null, v4: null, reste: 59000 },
        { name: 'GNYABRO ADOU MARIE PAULE', total: 260000, insc: 120000, v1: 40000, v2: null, v3: null, v4: null, reste: 100000 },
        { name: 'GOHO BEHA YVES PHARELL SINANE', total: 260000, insc: 60000, v1: 40000, v2: 50000, v3: 60000, v4: 50000, reste: 0 },
        { name: 'IRA MOHAMED SHAEEN', total: 260000, insc: 130000, v1: 100000, v2: null, v3: null, v4: null, reste: null },
        { name: 'KOUASSI YEYOLE MANUELLA', total: 234000, insc: 60000, v1: 50000, v2: 50000, v3: 50000, v4: 24000, reste: 0 },
        { name: 'MONNEY KELYA ANAIA MELODY', total: 260000, insc: 60000, v1: 70000, v2: 70000, v3: 60000, v4: null, reste: 0 },
        { name: 'SANGBE ADJOUA ASSENA', total: 260000, insc: 130000, v1: 50000, v2: 50000, v3: 30000, v4: null, reste: 0 },
        { name: 'TIEMELE NHYIRA ESTHER', total: 260000, insc: 130000, v1: 70000, v2: 60000, v3: null, v4: null, reste: 0 },
        { name: 'TANOH YAO DJAHA MARIE KIMBERLY', total: 260000, insc: 60000, v1: 70000, v2: 40000, v3: 90000, v4: null, reste: 0 },
        { name: 'YOHOU CHRIS NATHAN', total: 260000, insc: 260000, v1: null, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'KONAN KONAN NATHANAEL', total: 234000, insc: 100000, v1: null, v2: null, v3: null, v4: null, reste: 134000 },
      ],
    },
    {
      className: 'Moyenne Section-A',
      students: [
        { name: 'DJEDRI ANOUANZE ESTHER', total: 221000, insc: 45000, v1: 50000, v2: 126000, v3: null, v4: null, reste: 0 },
        { name: 'ALLAH FAHOUNDI ELISHAMA', total: 235000, insc: 35000, v1: 50000, v2: 50000, v3: 50000, v4: 50000, reste: 0 },
        { name: 'BAHIRO ASSENA BERENISSE', total: 260000, insc: 175000, v1: 85000, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'ZEBIHI ETHAN LOIC', total: 260000, insc: 60000, v1: 50000, v2: 50000, v3: 50000, v4: '30000+20000', reste: null },
        { name: 'SO HELENA DARNELLE NALYA', total: 260000, insc: 130000, v1: 50000, v2: null, v3: null, v4: null, reste: 80000 },
        { name: "N'GUESSAN RAMISSOU", total: 260000, insc: 130000, v1: 130000, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'OUATTARA SORAYA BINTOU', total: 260000, insc: 130000, v1: 60000, v2: 70000, v3: null, v4: null, reste: 0 },
        { name: "KOUASSI N'GUESSAN KETH", total: 260000, insc: 60000, v1: 70000, v2: 75000, v3: 55000, v4: null, reste: 0 },
        { name: 'SANOU SHANIELLE LYNE', total: 260000, insc: 130000, v1: 130000, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'FOFANA HAMAD MOUSSA', total: 260000, insc: 60000, v1: 70000, v2: 60000, v3: 60000, v4: null, reste: 10000 },
        { name: 'DOUON ROHI', total: 260000, insc: 130000, v1: 70000, v2: 60000, v3: null, v4: null, reste: 0 },
        { name: 'QUENUM CHLOE LYNNA', total: 260000, insc: 160000, v1: 100000, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'YAO EYOLI LYA DARNELLE', total: 234000, insc: 60000, v1: 50000, v2: 50000, v3: 74000, v4: null, reste: 0 },
        { name: 'VANIE AYLAN ELIAKIM', total: 260000, insc: 130000, v1: 70000, v2: 60000, v3: null, v4: null, reste: 0 },
        { name: "BROU N'DJHI IRIS", total: 260000, insc: 130000, v1: 130000, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'COULIBALY NADJANAYA', total: 260000, insc: 210000, v1: 50000, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'ETCHE IVY ANAELLE DAHLIA', total: 260000, insc: 130000, v1: 50000, v2: 80000, v3: null, v4: null, reste: 0 },
      ],
    },
    {
      className: 'Grande Section-A',
      students: [
        { name: 'AMANI STELLA MARIE FLORIANNE', total: 235000, insc: 110000, v1: 40000, v2: 50000, v3: 30000, v4: null, reste: 5000 },
        { name: 'ZOUZOUA ROLLO JOYCE', total: 260000, insc: 100000, v1: 50000, v2: 80000, v3: 30000, v4: null, reste: 0 },
        { name: "AYE LIAM M'BOUAFOUE", total: 260000, insc: 130000, v1: 60000, v2: 70000, v3: null, v4: null, reste: 0 },
        { name: 'AKAKPO MERVIN RAYANNE', total: 260000, insc: 50000, v1: 70000, v2: 70000, v3: 60000, v4: null, reste: 10000 },
        { name: 'TRE MOMBLEA CANDICE NAELLE', total: 260000, insc: 130000, v1: 130000, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'ADOU KOUAKOU JOREL', total: 260000, insc: 60000, v1: 70000, v2: 60000, v3: 70000, v4: null, reste: 0 },
        { name: 'AMONKOU SOHAHI YAEL', total: 260000, insc: 60000, v1: 70000, v2: 70000, v3: 60000, v4: null, reste: 0 },
        { name: 'DIOP KONAN ELI ABRAHAM', total: 221000, insc: 45000, v1: 50000, v2: 126000, v3: null, v4: null, reste: 0 },
        { name: 'KOUADIA JERIEL YORAM', total: 221000, insc: 130000, v1: 70000, v2: 21000, v3: null, v4: null, reste: 0 },
        { name: 'KIRIFO ADOM CHRIST YVAN', total: 260000, insc: 100000, v1: 30000, v2: 75000, v3: 55000, v4: null, reste: 0 },
        { name: 'KOFFI ECLOI', total: 260000, insc: 50000, v1: 80000, v2: 40000, v3: 50000, v4: 40000, reste: 0 },
        { name: "N'GUESSAN KEREN AKOUA GRACE", total: 260000, insc: 80000, v1: 70000, v2: 60000, v3: 50000, v4: null, reste: 0 },
        { name: 'ZOHIN GUEASSE PRIELLE', total: 260000, insc: 80000, v1: 70000, v2: 30000, v3: 30000, v4: 50000, reste: 0 },
        { name: 'YAO KOUADIO LIX-EMMAUS', total: 234000, insc: 50000, v1: 100000, v2: 50000, v3: 20000, v4: 14000, reste: null },
        { name: 'KOFFI AYA ELYANNA', total: 260000, insc: 130000, v1: 100000, v2: 30000, v3: null, v4: null, reste: 0 },
        { name: 'KOUAKOU JEREMY', total: 260000, insc: 30000, v1: 120000, v2: 30000, v3: 70000, v4: null, reste: 10000 },
        { name: 'KOUAME KOUADIO KAYLA', total: 260000, insc: 50000, v1: 80000, v2: 70000, v3: 50000, v4: null, reste: 10000 },
        { name: 'YAO KONAN ELISHAMA', total: 234000, insc: 100000, v1: null, v2: null, v3: null, v4: null, reste: 134000 },
      ],
    },
    {
      className: 'CP1-A',
      students: [
        { name: 'KOUAME JEAN PAVEL RAYAN', total: 350000, insc: 50000, v1: 100000, v2: 100000, v3: 100000, v4: null, reste: 0 },
        { name: "N'GATTA MARIE STELLA MAELYA", total: 315000, insc: 300000, v1: 15000, v2: null, v3: null, v4: null, reste: 0 },
        { name: 'TRAORE ANGELO', total: 350000, insc: 150000, v1: 100000, v2: 100000, v3: null, v4: null, reste: 0 },
        { name: 'TRAORE KYLIAN SUCCES', total: 350000, insc: 150000, v1: 100000, v2: 100000, v3: null, v4: null, reste: 0 },
        { name: 'DIOMANDE FADILA', total: 350000, insc: 100000, v1: 40000, v2: 100000, v3: 110000, v4: null, reste: 0 },
        { name: 'SORO YERIM', total: 315000, insc: 100000, v1: 50000, v2: 150000, v3: 15000, v4: null, reste: 0 },
      ],
      declaredTotals: { insc: 850000, v1: 405000, v2: 550000, v3: null, v4: null },
    },
    {
      className: 'CPU-A',
      students: [
        { name: 'PEHE ARLETTE TODO LAEL', total: 350000, insc: 150000, v1: 100000, v2: 100000, v3: null, v4: null, reste: 0 },
        { name: 'KOUAME GNAMIENWA MARIE THERESE', total: 350000, insc: 70000, v1: 50000, v2: 20000, v3: 35000, v4: 35000, reste: 140000 },
        { name: 'GUIROBO YBEYOU MARC DUVALL', total: 315000, insc: 100000, v1: 50000, v2: 150000, v3: 15000, v4: null, reste: 0 },
        { name: 'KOUADIO MIENSAH BERAKA YONAH', total: 350000, insc: 40000, v1: 160000, v2: 20000, v3: 80000, v4: 50000, reste: 0 },
        { name: 'KOIVOGUI NANTEH KHALIDA BINI', total: 315000, insc: 40000, v1: 110000, v2: 50000, v3: 115000, v4: null, reste: 0 },
        { name: 'HOUPHOUET MIENOMAN ALVIN', total: 297000, insc: 150000, v1: 100000, v2: 47000, v3: null, v4: null, reste: 0 },
        { name: 'HALA KAMISSA INAYA', total: 350000, insc: 40000, v1: 100000, v2: 150000, v3: 60000, v4: null, reste: 0 },
        { name: 'KOUAKOU MAYANA YONA', total: 350000, insc: 50000, v1: 100000, v2: 100000, v3: 100000, v4: null, reste: 0 },
        { name: 'DE LACELLE HANNAH', total: 335000, insc: 100000, v1: 100000, v2: 135000, v3: null, v4: null, reste: 0 },
        { name: 'DIABATE KATCHINNIN AYANOA', total: 350000, insc: 60000, v1: 90000, v2: 50000, v3: 100000, v4: 50000, reste: 0 },
        { name: 'DJEDRI MOAYEDAN LYDIE AMOUR', total: 297000, insc: 115000, v1: 100000, v2: 48000, v3: 34000, v4: null, reste: 0 },
        // Cellule 3E VERSEMENT confirmée vide par le client (capture d'écran) : pas corrompue, juste sans paiement.
        { name: 'EHOUMAN ANOH MARDOCHEE', total: 350000, insc: 150000, v1: 100000, v2: 50000, v3: null, v4: null, reste: 50000 },
        { name: 'KONAN OUSSOU LUNA NELSIA', total: 350000, insc: 60000, v1: 55000, v2: 70000, v3: 100000, v4: 65000, reste: 0 },
        // "K0UADI0" corrigé en "KOUADIO" (confirmé par le client, typo de saisie).
        { name: 'KOUADIO KYLIAN FIACRE', total: 350000, insc: 150000, v1: 100000, v2: 100000, v3: null, v4: null, reste: 0 },
        { name: 'KONE BINTOU MAELLE MADIRHA', total: 350000, insc: 40000, v1: 100000, v2: 60000, v3: 100000, v4: 20000, reste: 30000 },
        { name: 'KOUAME SOURALE ANAIS', total: 350000, insc: 40000, v1: 100000, v2: 100000, v3: null, v4: null, reste: 110000 },
        { name: 'OKA ELIAKIM WALID', total: 350000, insc: 70000, v1: null, v2: null, v3: null, v4: null, reste: 280000 },
        { name: "N'GUESSAN AKISSI ELVIRA", total: 350000, insc: 40000, v1: 110000, v2: 100000, v3: 50000, v4: 50000, reste: 0 },
        { name: 'VALET AZOLET MARY-LYHIA', total: 350000, insc: 40000, v1: 110000, v2: 100000, v3: 100000, v4: null, reste: 0 },
        // Ligne n°20 du tableau source : aucun nom renseigné -> impossible à rapprocher, exclue.
        // Ligne "DJOUBISSE KAYLIE PRINCESSE" : présente uniquement dans le récapitulatif global
        // (total payé 315000, "-"), absente du tableau détaillé -> aucune ventilation par échéance
        // disponible, donc exclue elle aussi (voir rapport "à traiter manuellement").
      ],
      // NB : cette ligne TOTAL du tableau source inclut la ligne n°20 (sans nom,
      // insc 150000 / v1 150000 / v2 15000) volontairement exclue ci-dessus.
      // L'écart de 150000/150000/15000 signalé par le script à l'exécution est donc
      // attendu, pas une erreur de transcription.
      declaredTotals: { insc: 1655000, v1: 1885000, v2: 1465000, v3: null, v4: null },
    },
    {
      className: 'CE1-A',
      students: [
        { name: 'ALLAH ATCHELO MERVEILLE', total: 315000, insc: 65000, v1: 50000, v2: 50000, v3: 50000, v4: 100000, reste: 0 },
        { name: 'KOIVOGUI KINOUKLAN KAIS AHMAD', total: 315000, insc: 40000, v1: 110000, v2: 50000, v3: 115000, v4: null, reste: 0 },
        { name: 'KOUASSI MIENMAN MARIE PRUNELLE', total: 350000, insc: 60000, v1: 90000, v2: 100000, v3: 100000, v4: null, reste: 0 },
        { name: 'HOUPHOUET BERENICE FERIMA', total: 297000, insc: 150000, v1: 100000, v2: 38000, v3: null, v4: null, reste: 9000 },
        { name: "N'GOUANDI N'CHIRA CHEDNA", total: 350000, insc: 150000, v1: 100000, v2: 100000, v3: null, v4: null, reste: 0 },
        { name: 'KOUADIA APO KENAELLE', total: 297000, insc: 150000, v1: 100000, v2: 40000, v3: 7000, v4: null, reste: 0 },
        { name: 'KEITA IBRAHIM KALIL', total: 297000, insc: 150000, v1: 100000, v2: 47000, v3: null, v4: null, reste: 0 },
        { name: 'KOFFI ILYANA PAULE-MAUREEN', total: 350000, insc: 150000, v1: 100000, v2: 100000, v3: null, v4: null, reste: 0 },
        { name: 'MELESS EMLYS YOU RUTH', total: 350000, insc: 80000, v1: 70000, v2: 100000, v3: 100000, v4: null, reste: 0 },
        { name: 'KOUAME BOUEDOU MYRACLE', total: 350000, insc: 40000, v1: 110000, v2: 100000, v3: 100000, v4: null, reste: 0 },
      ],
      declaredTotals: { insc: 1035000, v1: 930000, v2: 725000, v3: null, v4: null, reste: 9000 },
    },
  ],
};
