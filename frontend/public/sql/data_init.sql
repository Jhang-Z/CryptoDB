CREATE DATABASE IF NOT EXISTS `test`;
USE `test`;
 
DROP TABLE IF EXISTS `user_credit`;
CREATE TABLE `user_credit` (
	`ID` varchar(64) NOT NULL,
	`credit_rank` int NOT NULL,
	`income` int NOT NULL,
	`age` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `user_credit` WRITE;
INSERT INTO `user_credit` VALUES ("1", 6, 100000, 20);
INSERT INTO `user_credit` VALUES ("1", 4, 200000, 30);
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


DROP TABLE IF EXISTS `user_stats`;
CREATE TABLE `user_stats` (
	`ID` varchar(64) not NULL,
	`order_amount` int NOT NULL,
	`is_active` tinyint(1) not null,
	PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `user_stats` WRITE;
INSERT INTO `user_stats` VALUES ("1", 3598, 1);
INSERT INTO `user_stats` VALUES ("2", 100, 0);
INSERT INTO `user_stats` VALUES ("3", 2549, 1);
INSERT INTO `user_stats` VALUES ("4", 21698, 1);
INSERT INTO `user_stats` VALUES ("5", 4985, 1);
INSERT INTO `user_stats` VALUES ("6", 3598, 1);
INSERT INTO `user_stats` VALUES ("7", 322, 0);
INSERT INTO `user_stats` VALUES ("8", 9816, 1);
INSERT INTO `user_stats` VALUES ("9", 3598, 1);
INSERT INTO `user_stats` VALUES ("10", 322, 0);
INSERT INTO `user_stats` VALUES ("11", 9816, 1);
INSERT INTO `user_stats` VALUES ("12", 3598, 1);
INSERT INTO `user_stats` VALUES ("13", 322, 0);
INSERT INTO `user_stats` VALUES ("14", 9816, 1);
INSERT INTO `user_stats` VALUES ("15", 9816, 1);
INSERT INTO `user_stats` VALUES ("16", 9816, 1);
INSERT INTO `user_stats` VALUES ("17", 3598, 1);
INSERT INTO `user_stats` VALUES ("18", 322, 0);
INSERT INTO `user_stats` VALUES ("19", 9816, 1);
INSERT INTO `user_stats` VALUES ("20", 9816, 1);
UNLOCK TABLES;