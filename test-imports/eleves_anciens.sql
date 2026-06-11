-- Sauvegarde base de données MySQL
-- Fichier exporté le 12 Juin 2022

CREATE TABLE `old_students` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `firstName` varchar(50) NOT NULL,
  `lastName` varchar(50) NOT NULL,
  `dateOfBirth` date NOT NULL,
  `gender` varchar(1) NOT NULL,
  `className` varchar(20) NOT NULL,
  `matricule` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
);

INSERT INTO `old_students` (`firstName`, `lastName`, `dateOfBirth`, `gender`, `className`, `matricule`) VALUES
('Awa', 'Diop', '2012-05-14', 'F', '6ème A', 'MAT-2022-001'),
('Seydou', 'Koné', '2011-02-28', 'M', '6ème B', 'MAT-2022-002'),
('Fatou', 'Bamba', '2013-11-05', 'F', '6ème A', 'MAT-2022-003'),
('Amadou', 'Traoré', '2010-08-22', 'M', '5ème B', 'MAT-2022-004');
