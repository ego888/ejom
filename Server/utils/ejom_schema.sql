/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.7.2-MariaDB, for osx10.20 (arm64)
--
-- Host: localhost    Database: ejom
-- ------------------------------------------------------
-- Server version	11.7.2-MariaDB-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `ejom`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `ejom` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `ejom`;

--
-- Table structure for table `DTRBatches`
--

DROP TABLE IF EXISTS `DTRBatches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `DTRBatches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `batchName` varchar(100) NOT NULL,
  `periodStart` date NOT NULL,
  `periodEnd` date NOT NULL,
  `uploadedBy` varchar(100) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  `entryCount` int(11) DEFAULT 0,
  `fileCount` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DTREntries`
--

DROP TABLE IF EXISTS `DTREntries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `DTREntries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `batchId` int(11) NOT NULL,
  `empId` varchar(50) NOT NULL,
  `empName` varchar(100) NOT NULL,
  `date` date NOT NULL,
  `dateOut` date DEFAULT NULL,
  `day` varchar(10) NOT NULL,
  `time` varchar(50) DEFAULT NULL,
  `rawState` varchar(50) DEFAULT NULL,
  `timeIn` varchar(20) DEFAULT NULL,
  `timeOut` varchar(20) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `hours` decimal(10,2) DEFAULT 0.00,
  `editedIn` tinyint(4) DEFAULT 0,
  `editedOut` tinyint(4) DEFAULT 0,
  `overtime` decimal(10,2) DEFAULT 0.00,
  `effectiveOT` decimal(10,2) DEFAULT 0.00,
  `holidayHours` decimal(10,2) DEFAULT 0.00,
  `holidayOT` decimal(10,2) DEFAULT 0.00,
  `holidayType` varchar(50) DEFAULT NULL,
  `specialHours` decimal(10,2) DEFAULT 0.00,
  `specialOT` decimal(10,2) DEFAULT 0.00,
  `sundayHours` decimal(10,2) DEFAULT 0.00,
  `sundayOT` decimal(10,2) DEFAULT 0.00,
  `nightDifferential` decimal(10,2) DEFAULT 0.00,
  `nightDifferentialOT` decimal(10,2) DEFAULT 0.00,
  `remarks` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  `processed` tinyint(4) NOT NULL DEFAULT 0,
  `deleteRecord` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `batchId` (`batchId`),
  CONSTRAINT `dtrentries_ibfk_1` FOREIGN KEY (`batchId`) REFERENCES `DTRBatches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=783 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DTRHolidays`
--

DROP TABLE IF EXISTS `DTRHolidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `DTRHolidays` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `holidayDate` date NOT NULL,
  `holidayType` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WTax`
--

DROP TABLE IF EXISTS `WTax`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `WTax` (
  `WTax` varchar(10) NOT NULL,
  `Description` varchar(30) NOT NULL,
  `withVAT` tinyint(1) NOT NULL DEFAULT 1,
  `taxRate` decimal(5,2) NOT NULL,
  PRIMARY KEY (`WTax`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `client`
--

DROP TABLE IF EXISTS `client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `client` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `clientName` varchar(100) DEFAULT '',
  `customerName` varchar(255) DEFAULT NULL,
  `contact` varchar(100) DEFAULT '',
  `telNo` varchar(100) DEFAULT '',
  `faxNo` varchar(100) DEFAULT '',
  `celNo` varchar(100) DEFAULT '',
  `email` varchar(255) DEFAULT NULL,
  `arContact` varchar(100) DEFAULT '',
  `arTelNo` varchar(100) DEFAULT '',
  `arFaxNo` varchar(100) DEFAULT '',
  `tinNumber` varchar(20) DEFAULT '',
  `notes` text DEFAULT NULL,
  `terms` varchar(7) DEFAULT '',
  `salesId` int(11) DEFAULT 0,
  `creditLimit` decimal(8,0) DEFAULT 0,
  `31-60` decimal(12,2) DEFAULT NULL,
  `61-90` decimal(12,2) DEFAULT NULL,
  `over90` decimal(12,2) DEFAULT NULL,
  `lastTransaction` date DEFAULT NULL,
  `overdue` date DEFAULT NULL,
  `hold` date DEFAULT NULL,
  `lastUpdated` date DEFAULT NULL,
  `lastPaymentAmount` decimal(12,2) DEFAULT 0.00,
  `lastPaymentDate` date DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `salesId` (`salesId`),
  CONSTRAINT `client_ibfk_1` FOREIGN KEY (`salesId`) REFERENCES `employee` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4248 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee`
--

DROP TABLE IF EXISTS `employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT '',
  `fullName` varchar(255) NOT NULL,
  `cellNumber` varchar(15) NOT NULL,
  `email` varchar(100) DEFAULT '',
  `password` varchar(255) NOT NULL,
  `address` varchar(255) DEFAULT '',
  `salary` decimal(8,2) DEFAULT 0.00,
  `image` varchar(255) DEFAULT '',
  `category_id` int(11) DEFAULT 2,
  `active` int(11) DEFAULT 1,
  `sales` int(11) DEFAULT 0,
  `accounting` int(11) DEFAULT 0,
  `artist` int(11) DEFAULT 0,
  `production` int(11) DEFAULT 0,
  `operator` int(11) DEFAULT 0,
  `admin` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `name` (`name`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `employee_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice`
--

DROP TABLE IF EXISTS `invoice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orderId` int(11) NOT NULL,
  `invoicePrefix` char(2) NOT NULL,
  `invoiceNumber` varchar(10) NOT NULL,
  `invoiceAmount` decimal(10,2) NOT NULL,
  `invoiceRemarks` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=332 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoicePrefix`
--

DROP TABLE IF EXISTS `invoicePrefix`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoicePrefix` (
  `invoicePrefix` char(2) NOT NULL,
  `prefixDescription` varchar(50) NOT NULL,
  `lastNumberUsed` varchar(10) NOT NULL DEFAULT '0',
  PRIMARY KEY (`invoicePrefix`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jomControl`
--

DROP TABLE IF EXISTS `jomControl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `jomControl` (
  `controlId` tinyint(4) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) DEFAULT NULL,
  `companyAddress1` varchar(255) DEFAULT NULL,
  `companyAddress2` varchar(255) DEFAULT NULL,
  `companyPhone` varchar(255) DEFAULT NULL,
  `companyEmail` varchar(255) DEFAULT NULL,
  `soaName` varchar(255) DEFAULT NULL,
  `vatPercent` decimal(8,2) DEFAULT 0.00,
  `lastDrNumber` int(11) DEFAULT NULL,
  `quoteDelivery` varchar(255) NOT NULL,
  `quoteApproval` varchar(255) NOT NULL,
  `bankInfo` varchar(100) DEFAULT NULL,
  `salesIncentive` decimal(5,2) NOT NULL,
  `overrideIncentive` decimal(5,2) NOT NULL,
  `HalfIncentiveSqFt` decimal(5,0) NOT NULL DEFAULT 12,
  `ArtistMaxPercent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `major` int(11) NOT NULL,
  `minor` int(11) NOT NULL,
  `ArtistMinAmount` decimal(5,0) NOT NULL DEFAULT 90,
  `calculateOverdue` date DEFAULT NULL,
  PRIMARY KEY (`controlId`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material`
--

DROP TABLE IF EXISTS `material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `material` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Material` varchar(20) NOT NULL,
  `Description` varchar(255) NOT NULL,
  `SqFtPerHour` int(11) DEFAULT 0,
  `MinimumPrice` decimal(8,2) DEFAULT 0.00,
  `FixWidth` decimal(8,2) DEFAULT 0.00,
  `FixHeight` decimal(8,2) DEFAULT 0.00,
  `Cost` decimal(8,2) DEFAULT 0.00,
  `UnitCost` tinyint(1) NOT NULL DEFAULT 0,
  `noIncentive` tinyint(1) NOT NULL DEFAULT 0,
  `MachineType` varchar(20) NOT NULL,
  `MaterialType` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_material` (`Material`)
) ENGINE=InnoDB AUTO_INCREMENT=153 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orderStatus`
--

DROP TABLE IF EXISTS `orderStatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderStatus` (
  `statusId` varchar(10) NOT NULL,
  `step` smallint(6) NOT NULL,
  PRIMARY KEY (`statusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_details`
--

DROP TABLE IF EXISTS `order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_details` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `orderId` int(10) unsigned NOT NULL,
  `displayOrder` int(10) unsigned NOT NULL,
  `quantity` decimal(10,2) unsigned DEFAULT 0.00,
  `width` decimal(10,2) unsigned DEFAULT 0.00,
  `height` decimal(10,2) unsigned DEFAULT 0.00,
  `unit` char(3) DEFAULT 'IN',
  `material` varchar(20) DEFAULT 'Tarp10',
  `top` decimal(2,0) unsigned NOT NULL DEFAULT 0,
  `bottom` decimal(2,0) unsigned NOT NULL DEFAULT 0,
  `allowanceLeft` decimal(2,0) unsigned NOT NULL DEFAULT 0,
  `allowanceRight` decimal(2,0) unsigned NOT NULL DEFAULT 0,
  `filename` text DEFAULT NULL,
  `unitPrice` decimal(10,2) unsigned NOT NULL DEFAULT 0.00,
  `perSqFt` decimal(10,2) unsigned NOT NULL DEFAULT 0.00,
  `standardPrice` decimal(6,2) unsigned NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) unsigned NOT NULL DEFAULT 0.00,
  `amount` decimal(10,2) unsigned NOT NULL DEFAULT 0.00,
  `remarks` text DEFAULT NULL,
  `itemDescription` text DEFAULT NULL,
  `noPrint` tinyint(4) NOT NULL DEFAULT 0,
  `printHrs` decimal(7,2) unsigned NOT NULL DEFAULT 0.00,
  `balanceHours` decimal(7,2) unsigned NOT NULL DEFAULT 0.00,
  `squareFeet` decimal(8,2) NOT NULL DEFAULT 0.00,
  `materialUsage` decimal(10,2) NOT NULL DEFAULT 0.00,
  `auditQuantity` decimal(8,2) NOT NULL DEFAULT 0.00,
  `auditremaining` decimal(8,2) NOT NULL DEFAULT 0.00,
  `salesIncentive` decimal(10,2) NOT NULL DEFAULT 0.00,
  `overideIncentive` decimal(10,2) NOT NULL DEFAULT 0.00,
  `artistIncentive` varchar(50) NOT NULL DEFAULT '',
  `major` int(11) NOT NULL DEFAULT 0,
  `minor` int(11) NOT NULL DEFAULT 0,
  `artistIncentiveAmount` decimal(8,2) NOT NULL DEFAULT 0.00,
  UNIQUE KEY `unique_order_detail` (`orderId`,`displayOrder`),
  KEY `orderid` (`Id`),
  KEY `material` (`material`)
) ENGINE=InnoDB AUTO_INCREMENT=588900 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `orderId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `revision` int(11) NOT NULL DEFAULT 0,
  `branchCode` char(4) DEFAULT 'MAIN',
  `clientId` int(10) unsigned DEFAULT NULL,
  `terms` varchar(7) DEFAULT '',
  `orderReference` varchar(20) DEFAULT '',
  `projectName` varchar(50) DEFAULT NULL,
  `preparedBy` int(11) DEFAULT NULL,
  `orderDate` date DEFAULT NULL,
  `orderedBy` varchar(15) DEFAULT '',
  `cellNumber` varchar(11) DEFAULT '',
  `specialInst` text DEFAULT NULL,
  `deliveryInst` text DEFAULT NULL,
  `graphicsBy` int(11) DEFAULT NULL,
  `dueDate` date DEFAULT NULL,
  `dueTime` varchar(8) DEFAULT '',
  `editedBy` varchar(50) DEFAULT NULL,
  `sample` tinyint(1) DEFAULT 0,
  `reprint` tinyint(1) DEFAULT 0,
  `goprint` tinyint(1) DEFAULT 0,
  `status` varchar(10) DEFAULT 'Open',
  `totalAmount` decimal(10,2) DEFAULT 0.00,
  `percentDisc` decimal(3,0) DEFAULT 0,
  `amountDisc` decimal(8,2) DEFAULT 0.00,
  `grandTotal` decimal(10,2) DEFAULT 0.00,
  `amountPaid` decimal(10,2) DEFAULT 0.00,
  `datePaid` date DEFAULT NULL,
  `forProd` tinyint(1) DEFAULT 0,
  `productionDate` datetime DEFAULT NULL,
  `readyDate` datetime DEFAULT NULL,
  `deliveryDate` datetime DEFAULT NULL,
  `drDate` date DEFAULT NULL,
  `drNum` varchar(30) DEFAULT '',
  `forBill` tinyint(1) DEFAULT 0,
  `billDate` datetime DEFAULT NULL,
  `invoiceNum` varchar(30) DEFAULT '',
  `lastEdited` datetime DEFAULT NULL,
  `totalHrs` decimal(10,2) DEFAULT 0.00,
  `closeDate` datetime DEFAULT NULL,
  `invReport` tinyint(1) DEFAULT 0,
  `remit` tinyint(1) DEFAULT 0,
  `log` text DEFAULT NULL,
  PRIMARY KEY (`orderId`),
  KEY `clientId` (`clientId`),
  KEY `cellNumber` (`cellNumber`),
  KEY `status` (`status`),
  KEY `idx_orderDate` (`orderDate`),
  KEY `idx_preparedBy` (`preparedBy`),
  KEY `idx_search` (`orderId`,`projectName`,`orderedBy`,`drNum`,`invoiceNum`,`orderReference`),
  KEY `fk_orders_terms` (`terms`),
  CONSTRAINT `fk_orders_clientId` FOREIGN KEY (`clientId`) REFERENCES `client` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_status` FOREIGN KEY (`status`) REFERENCES `orderStatus` (`statusId`) ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_terms` FOREIGN KEY (`terms`) REFERENCES `paymentTerms` (`terms`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=191840 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `paymentJoAllocation`
--

DROP TABLE IF EXISTS `paymentJoAllocation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `paymentJoAllocation` (
  `payId` int(10) unsigned NOT NULL,
  `orderId` int(10) unsigned NOT NULL,
  `amountApplied` decimal(10,2) NOT NULL,
  KEY `fk_pja_payId` (`payId`),
  KEY `fk_pja_orderId` (`orderId`),
  KEY `idx_payment_allocation` (`payId`,`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`wampuser`@`%`*/ /*!50003 TRIGGER trg_updateAmountPaid_after_insert
AFTER INSERT ON paymentJoAllocation
FOR EACH ROW
BEGIN
  UPDATE orders
  SET amountPaid = (
    SELECT COALESCE(SUM(amountApplied), 0)
    FROM paymentJoAllocation
    WHERE orderId = NEW.orderId
  )
  WHERE orderId = NEW.orderId;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`wampuser`@`%`*/ /*!50003 TRIGGER trg_updateAmountPaid_after_delete
AFTER DELETE ON paymentJoAllocation
FOR EACH ROW
BEGIN
  UPDATE orders
  SET amountPaid = (
    SELECT COALESCE(SUM(amountApplied), 0)
    FROM paymentJoAllocation
    WHERE orderId = OLD.orderId
  )
  WHERE orderId = OLD.orderId;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `paymentTerms`
--

DROP TABLE IF EXISTS `paymentTerms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `paymentTerms` (
  `terms` varchar(7) NOT NULL,
  `days` tinyint(3) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`terms`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `paymentType`
--

DROP TABLE IF EXISTS `paymentType`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `paymentType` (
  `payType` varchar(20) NOT NULL,
  PRIMARY KEY (`payType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) unsigned NOT NULL DEFAULT 0.00,
  `payType` varchar(20) NOT NULL DEFAULT 'Cash',
  `ornum` varchar(15) NOT NULL,
  `payReference` varchar(50) DEFAULT NULL,
  `payDate` date DEFAULT NULL,
  `postedDate` datetime NOT NULL,
  `remittedDate` datetime DEFAULT NULL,
  `transactedBy` varchar(50) DEFAULT NULL,
  `remittedBy` varchar(50) DEFAULT NULL,
  `received` tinyint(4) NOT NULL DEFAULT 0,
  `receivedBy` varchar(50) DEFAULT NULL,
  `receivedDate` datetime DEFAULT NULL,
  PRIMARY KEY (`payId`),
  KEY `fk_payments_payType` (`payType`),
  KEY `idx_ornum` (`ornum`),
  CONSTRAINT `fk_payments_payType` FOREIGN KEY (`payType`) REFERENCES `paymentType` (`payType`)
) ENGINE=InnoDB AUTO_INCREMENT=156544 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`wampuser`@`%`*/ /*!50003 TRIGGER trg_onDeletePayment
AFTER DELETE ON payments
FOR EACH ROW
BEGIN
  DELETE FROM paymentJoAllocation WHERE payId = OLD.payId;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `quoteStatus`
--

DROP TABLE IF EXISTS `quoteStatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `quoteStatus` (
  `statusId` char(10) NOT NULL,
  `step` smallint(6) NOT NULL,
  PRIMARY KEY (`statusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quote_details`
--

DROP TABLE IF EXISTS `quote_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `quote_details` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `quoteId` int(11) DEFAULT NULL,
  `displayOrder` tinyint(4) NOT NULL,
  `quantity` decimal(10,2) DEFAULT 0.00,
  `width` decimal(10,2) DEFAULT 0.00,
  `height` decimal(10,2) DEFAULT 0.00,
  `unit` char(3) DEFAULT 'IN',
  `material` varchar(20) DEFAULT '',
  `unitPrice` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `amount` decimal(10,2) DEFAULT 0.00,
  `persqft` decimal(10,2) DEFAULT 0.00,
  `itemDescription` varchar(255) DEFAULT NULL,
  `printHours` decimal(5,1) DEFAULT 0.0,
  `squareFeet` decimal(8,2) NOT NULL DEFAULT 0.00,
  `materialUsage` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=607 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quotes`
--

DROP TABLE IF EXISTS `quotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotes` (
  `quoteId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `clientId` int(10) unsigned DEFAULT NULL,
  `clientName` varchar(100) NOT NULL,
  `terms` varchar(7) DEFAULT 'COD',
  `projectName` varchar(30) DEFAULT '',
  `preparedBy` int(11) DEFAULT 0,
  `quoteDate` date DEFAULT NULL,
  `orderedBy` varchar(15) DEFAULT '',
  `dueDate` date DEFAULT NULL,
  `status` char(10) DEFAULT 'Open',
  `totalAmount` decimal(11,2) DEFAULT 0.00,
  `amountDiscount` decimal(8,2) DEFAULT 0.00,
  `percentDisc` decimal(5,2) DEFAULT 0.00,
  `grandTotal` decimal(11,2) DEFAULT 0.00,
  `totalHrs` decimal(10,2) DEFAULT 0.00,
  `email` varchar(50) DEFAULT '',
  `telNum` varchar(30) DEFAULT '',
  `cellNumber` varchar(30) DEFAULT '',
  `statusRem` varchar(50) DEFAULT '',
  `refId` int(11) DEFAULT 0,
  `editedBy` varchar(50) DEFAULT '0',
  `lastedited` datetime NOT NULL DEFAULT current_timestamp(),
  `deliveryRemarks` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`quoteId`),
  KEY `fk_quotes_clientId` (`clientId`),
  KEY `fk_quotes_terms` (`terms`),
  KEY `fk_quotes_status` (`status`),
  CONSTRAINT `fk_quotes_status` FOREIGN KEY (`status`) REFERENCES `quoteStatus` (`statusId`) ON UPDATE CASCADE,
  CONSTRAINT `fk_quotes_terms` FOREIGN KEY (`terms`) REFERENCES `paymentTerms` (`terms`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=215 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `temp`
--

DROP TABLE IF EXISTS `temp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `temp` (
  `CLIENT` varchar(100) NOT NULL,
  `CUSTNAME` varchar(255) NOT NULL,
  `EMAIL` varchar(255) NOT NULL,
  `NOTES` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tempPaymentAllocation`
--

DROP TABLE IF EXISTS `tempPaymentAllocation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tempPaymentAllocation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `payId` int(11) NOT NULL,
  `orderId` int(10) unsigned NOT NULL,
  `amountApplied` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `payId` (`payId`),
  KEY `orderId` (`orderId`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tempPayments`
--

DROP TABLE IF EXISTS `tempPayments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tempPayments` (
  `payId` int(11) NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) NOT NULL,
  `payType` varchar(20) NOT NULL,
  `payReference` varchar(50) DEFAULT NULL,
  `payDate` date NOT NULL,
  `ornum` varchar(15) DEFAULT NULL,
  `postedDate` datetime NOT NULL,
  `transactedBy` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`payId`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `units`
--

DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `unit` char(2) NOT NULL,
  `description` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`unit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'ejom'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-04-27 18:19:42
