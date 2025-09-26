CREATE DATABASE IF NOT EXISTS `test`;
USE `test`;
 
DROP TABLE IF EXISTS `user_credit`;
CREATE TABLE `user_credit` (
	`ID` varchar(64) NOT NULL,
	`credit_rank` int NOT NULL,
	`income` int NOT NULL,
	`age` int NOT NULL,
	PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `user_credit` WRITE;
INSERT INTO `user_credit` VALUES ("1", 6, 100000, 20);
INSERT INTO `user_credit` VALUES ("2", 5, 90000, 19);
INSERT INTO `user_credit` VALUES ("3", 6, 89700, 32);
INSERT INTO `user_credit` VALUES ("4", 6, 607000, 30);
INSERT INTO `user_credit` VALUES ("5", 5, 30070, 25);
INSERT INTO `user_credit` VALUES ("6", 6, 12070, 28);
INSERT INTO `user_credit` VALUES ("7", 6, 200800, 50);
INSERT INTO `user_credit` VALUES ("8", 6, 607000, 30);
INSERT INTO `user_credit` VALUES ("9", 5, 30070, 25);
INSERT INTO `user_credit` VALUES ("10", 5, 12070, 28);
INSERT INTO `user_credit` VALUES ("11", 6, 200800, 50);
INSERT INTO `user_credit` VALUES ("12", 5, 30070, 25);
INSERT INTO `user_credit` VALUES ("13", 5, 12070, 28);
INSERT INTO `user_credit` VALUES ("14", 6, 200800, 18);
INSERT INTO `user_credit` VALUES ("15", 5, 30070, 26);
INSERT INTO `user_credit` VALUES ("16", 5, 12070, 27);
INSERT INTO `user_credit` VALUES ("17", 6, 200800, 16);
INSERT INTO `user_credit` VALUES ("18", 6, 30070, 25);
INSERT INTO `user_credit` VALUES ("19", 5, 12070, 28);
UNLOCK TABLES;

DROP TABLE IF EXISTS `user_credit1`;
CREATE TABLE `user_credit1` (
	`ID` varchar(64) NOT NULL,
	`credit_rank` int NOT NULL,
	`income` int NOT NULL,
	`age` int NOT NULL,
	PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `user_credit1` WRITE;
INSERT INTO `user_credit1` VALUES ("1", 6, 100000, 20);
INSERT INTO `user_credit1` VALUES ("2", 5, 90000, 19);
INSERT INTO `user_credit1` VALUES ("3", 6, 89700, 32);
INSERT INTO `user_credit1` VALUES ("4", 6, 607000, 30);
INSERT INTO `user_credit1` VALUES ("5", 5, 30070, 25);
INSERT INTO `user_credit1` VALUES ("6", 6, 12070, 28);
INSERT INTO `user_credit1` VALUES ("7", 6, 200800, 50);
INSERT INTO `user_credit1` VALUES ("8", 6, 607000, 30);
INSERT INTO `user_credit1` VALUES ("9", 5, 30070, 25);
INSERT INTO `user_credit1` VALUES ("10", 5, 12070, 28);
INSERT INTO `user_credit1` VALUES ("11", 6, 200800, 50);
INSERT INTO `user_credit1` VALUES ("12", 5, 30070, 25);
INSERT INTO `user_credit1` VALUES ("13", 5, 12070, 28);
INSERT INTO `user_credit1` VALUES ("14", 6, 200800, 18);
INSERT INTO `user_credit1` VALUES ("15", 5, 30070, 26);
INSERT INTO `user_credit1` VALUES ("16", 5, 12070, 27);
INSERT INTO `user_credit1` VALUES ("17", 6, 200800, 16);
INSERT INTO `user_credit1` VALUES ("18", 6, 30070, 25);
INSERT INTO `user_credit1` VALUES ("19", 5, 12070, 28);
UNLOCK TABLES;