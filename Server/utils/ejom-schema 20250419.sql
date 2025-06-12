-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:8889
-- Generation Time: Apr 22, 2025 at 07:50 AM
-- Server version: 8.0.40
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ejom`
--

-- --------------------------------------------------------

--
-- Table structure for table `category`
--

CREATE TABLE `category` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `client`
--

CREATE TABLE `client` (
  `id` int UNSIGNED NOT NULL,
  `clientName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '',
  `customerName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `contact` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '',
  `telNo` varchar(100) DEFAULT '',
  `faxNo` varchar(100) DEFAULT '',
  `celNo` varchar(100) DEFAULT '',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `arContact` varchar(100) DEFAULT '',
  `arTelNo` varchar(100) DEFAULT '',
  `arFaxNo` varchar(100) DEFAULT '',
  `tinNumber` varchar(20) DEFAULT '',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `terms` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '',
  `salesId` int DEFAULT '0',
  `creditLimit` decimal(8,0) DEFAULT '0',
  `over30` decimal(12,2) DEFAULT NULL,
  `over60` decimal(12,2) DEFAULT NULL,
  `over90` decimal(12,2) DEFAULT NULL,
  `lastTransaction` date DEFAULT NULL,
  `overdue` date DEFAULT NULL,
  `hold` date DEFAULT NULL,
  `lastUpdated` date DEFAULT NULL,
  `lastPaymentAmount` decimal(12,2) DEFAULT '0.00',
  `lastPaymentDate` date DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `DTRBatches`
--

CREATE TABLE `DTRBatches` (
  `id` int NOT NULL,
  `batchName` varchar(100) NOT NULL,
  `periodStart` date NOT NULL,
  `periodEnd` date NOT NULL,
  `uploadedBy` varchar(100) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `entryCount` int DEFAULT '0',
  `fileCount` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `DTREntries`
--

CREATE TABLE `DTREntries` (
  `id` int NOT NULL,
  `batchId` int NOT NULL,
  `empId` varchar(50) NOT NULL,
  `empName` varchar(100) NOT NULL,
  `date` date NOT NULL,
  `dateOut` date DEFAULT NULL,
  `day` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `time` varchar(50) DEFAULT NULL,
  `rawState` varchar(50) DEFAULT NULL,
  `timeIn` varchar(20) DEFAULT NULL,
  `timeOut` varchar(20) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `hours` decimal(10,2) DEFAULT '0.00',
  `editedIn` tinyint DEFAULT '0',
  `editedOut` tinyint DEFAULT '0',
  `overtime` decimal(10,2) DEFAULT '0.00',
  `effectiveOT` decimal(10,2) DEFAULT '0.00',
  `holidayHours` decimal(10,2) DEFAULT '0.00',
  `holidayOT` decimal(10,2) DEFAULT '0.00',
  `holidayType` varchar(50) DEFAULT NULL,
  `specialHours` decimal(10,2) DEFAULT '0.00',
  `specialOT` decimal(10,2) DEFAULT '0.00',
  `sundayHours` decimal(10,2) DEFAULT '0.00',
  `sundayOT` decimal(10,2) DEFAULT '0.00',
  `nightDifferential` decimal(10,2) DEFAULT '0.00',
  `nightDifferentialOT` decimal(10,2) DEFAULT '0.00',
  `remarks` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `processed` tinyint NOT NULL DEFAULT '0',
  `deleteRecord` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `DTRHolidays`
--

CREATE TABLE `DTRHolidays` (
  `id` int NOT NULL,
  `holidayDate` date NOT NULL,
  `holidayType` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee`
--

CREATE TABLE `employee` (
  `id` int NOT NULL,
  `name` varchar(50) DEFAULT '',
  `fullName` varchar(255) NOT NULL,
  `cellNumber` varchar(15) NOT NULL,
  `email` varchar(100) DEFAULT '',
  `password` varchar(255) NOT NULL,
  `address` varchar(255) DEFAULT '',
  `salary` decimal(8,2) DEFAULT '0.00',
  `image` varchar(255) DEFAULT '',
  `category_id` int DEFAULT '2',
  `active` int DEFAULT '1',
  `sales` int DEFAULT '0',
  `accounting` int DEFAULT '0',
  `artist` int DEFAULT '0',
  `production` int DEFAULT '0',
  `operator` int DEFAULT '0',
  `admin` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice`
--

CREATE TABLE `invoice` (
  `id` int NOT NULL,
  `orderId` int NOT NULL,
  `invoicePrefix` char(2) NOT NULL,
  `invoiceNumber` varchar(10) NOT NULL,
  `invoiceAmount` decimal(10,2) NOT NULL,
  `invoiceRemarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoicePrefix`
--

CREATE TABLE `invoicePrefix` (
  `invoicePrefix` char(2) NOT NULL,
  `prefixDescription` varchar(50) NOT NULL,
  `lastNumberUsed` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jomControl`
--

CREATE TABLE `jomControl` (
  `controlId` tinyint NOT NULL,
  `companyName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `companyAddress1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `companyAddress2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `companyPhone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `companyEmail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `soaName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `vatPercent` decimal(8,2) DEFAULT '0.00',
  `lastDrNumber` int DEFAULT NULL,
  `quoteDelivery` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `quoteApproval` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `bankInfo` varchar(100) DEFAULT NULL,
  `salesIncentive` decimal(5,2) NOT NULL,
  `overrideIncentive` decimal(5,2) NOT NULL,
  `HalfIncentiveSqFt` decimal(5,0) NOT NULL DEFAULT '12',
  `ArtistMaxPercent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `major` int NOT NULL,
  `minor` int NOT NULL,
  `ArtistMinAmount` decimal(5,0) NOT NULL DEFAULT '90',
  `calculateOverdue` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material`
--

CREATE TABLE `material` (
  `id` int NOT NULL,
  `Material` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `SqFtPerHour` int DEFAULT '0',
  `MinimumPrice` decimal(8,2) DEFAULT '0.00',
  `FixWidth` decimal(8,2) DEFAULT '0.00',
  `FixHeight` decimal(8,2) DEFAULT '0.00',
  `Cost` decimal(8,2) DEFAULT '0.00',
  `UnitCost` tinyint(1) NOT NULL DEFAULT '0',
  `noIncentive` tinyint(1) NOT NULL DEFAULT '0',
  `MachineType` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `MaterialType` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `orderId` int UNSIGNED NOT NULL,
  `revision` int NOT NULL DEFAULT '0',
  `branchCode` char(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'MAIN',
  `clientId` int UNSIGNED DEFAULT NULL,
  `terms` varchar(7) DEFAULT '',
  `orderReference` varchar(20) DEFAULT '',
  `projectName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `preparedBy` int DEFAULT NULL,
  `orderDate` date DEFAULT NULL,
  `orderedBy` varchar(15) DEFAULT '',
  `cellNumber` varchar(11) DEFAULT '',
  `specialInst` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `deliveryInst` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `graphicsBy` int DEFAULT NULL,
  `dueDate` date DEFAULT NULL,
  `dueTime` varchar(8) DEFAULT '',
  `editedBy` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `sample` tinyint(1) DEFAULT '0',
  `reprint` tinyint(1) DEFAULT '0',
  `goprint` tinyint(1) DEFAULT '0',
  `status` varchar(10) DEFAULT 'Open',
  `totalAmount` decimal(10,2) DEFAULT '0.00',
  `percentDisc` decimal(3,0) DEFAULT '0',
  `amountDisc` decimal(8,2) DEFAULT '0.00',
  `grandTotal` decimal(10,2) DEFAULT '0.00',
  `amountPaid` decimal(10,2) DEFAULT '0.00',
  `datePaid` date DEFAULT NULL,
  `forProd` tinyint(1) DEFAULT '0',
  `productionDate` datetime DEFAULT NULL,
  `readyDate` datetime DEFAULT NULL,
  `deliveryDate` datetime DEFAULT NULL,
  `drDate` date DEFAULT NULL,
  `drNum` varchar(30) DEFAULT '',
  `forBill` tinyint(1) DEFAULT '0',
  `billDate` datetime DEFAULT NULL,
  `invoiceNum` varchar(30) DEFAULT '',
  `lastEdited` datetime DEFAULT NULL,
  `totalHrs` decimal(10,2) DEFAULT '0.00',
  `closeDate` datetime DEFAULT NULL,
  `invReport` tinyint(1) DEFAULT '0',
  `remit` tinyint(1) DEFAULT '0',
  `log` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orderStatus`
--

CREATE TABLE `orderStatus` (
  `statusId` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `step` smallint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_details`
--

CREATE TABLE `order_details` (
  `Id` int NOT NULL,
  `orderId` int UNSIGNED NOT NULL,
  `displayOrder` int UNSIGNED NOT NULL,
  `quantity` decimal(10,2) UNSIGNED DEFAULT '0.00',
  `width` decimal(10,2) UNSIGNED DEFAULT '0.00',
  `height` decimal(10,2) UNSIGNED DEFAULT '0.00',
  `unit` char(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'IN',
  `material` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'Tarp10',
  `top` decimal(2,0) UNSIGNED NOT NULL DEFAULT '0',
  `bottom` decimal(2,0) UNSIGNED NOT NULL DEFAULT '0',
  `allowanceLeft` decimal(2,0) UNSIGNED NOT NULL DEFAULT '0',
  `allowanceRight` decimal(2,0) UNSIGNED NOT NULL DEFAULT '0',
  `filename` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `unitPrice` decimal(10,2) UNSIGNED NOT NULL DEFAULT '0.00',
  `perSqFt` decimal(10,2) UNSIGNED NOT NULL DEFAULT '0.00',
  `standardPrice` decimal(6,2) UNSIGNED NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) UNSIGNED NOT NULL DEFAULT '0.00',
  `amount` decimal(10,2) UNSIGNED NOT NULL DEFAULT '0.00',
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `itemDescription` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `noPrint` tinyint NOT NULL DEFAULT '0',
  `printHrs` decimal(7,2) UNSIGNED NOT NULL DEFAULT '0.00',
  `balanceHours` decimal(7,2) UNSIGNED NOT NULL DEFAULT '0.00',
  `squareFeet` decimal(8,2) NOT NULL DEFAULT '0.00',
  `materialUsage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `auditQuantity` decimal(8,2) NOT NULL DEFAULT '0.00',
  `auditremaining` decimal(8,2) NOT NULL DEFAULT '0.00',
  `salesIncentive` decimal(10,2) NOT NULL DEFAULT '0.00',
  `overideIncentive` decimal(10,2) NOT NULL DEFAULT '0.00',
  `artistIncentive` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `major` int NOT NULL DEFAULT '0',
  `minor` int NOT NULL DEFAULT '0',
  `artistIncentiveAmount` decimal(8,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `paymentJoAllocation`
--

CREATE TABLE `paymentJoAllocation` (
  `payId` int UNSIGNED NOT NULL,
  `orderId` int UNSIGNED NOT NULL,
  `amountApplied` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payId` int UNSIGNED NOT NULL,
  `amount` decimal(10,2) UNSIGNED NOT NULL DEFAULT '0.00',
  `payType` varchar(20) NOT NULL DEFAULT 'Cash',
  `ornum` varchar(15) NOT NULL,
  `payReference` varchar(50) DEFAULT NULL,
  `payDate` date DEFAULT NULL,
  `postedDate` datetime NOT NULL,
  `remittedDate` datetime DEFAULT NULL,
  `transactedBy` varchar(50) DEFAULT NULL,
  `remittedBy` varchar(50) DEFAULT NULL,
  `received` tinyint NOT NULL DEFAULT '0',
  `receivedBy` varchar(50) DEFAULT NULL,
  `receivedDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `paymentTerms`
--

CREATE TABLE `paymentTerms` (
  `terms` varchar(7) NOT NULL,
  `days` tinyint UNSIGNED NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `paymentType`
--

CREATE TABLE `paymentType` (
  `payType` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quotes`
--

CREATE TABLE `quotes` (
  `quoteId` int UNSIGNED NOT NULL,
  `clientId` int UNSIGNED DEFAULT NULL,
  `clientName` varchar(100) NOT NULL,
  `terms` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'COD',
  `projectName` varchar(30) DEFAULT '',
  `preparedBy` int DEFAULT '0',
  `quoteDate` date DEFAULT NULL,
  `orderedBy` varchar(15) DEFAULT '',
  `dueDate` date DEFAULT NULL,
  `status` char(10) DEFAULT 'Open',
  `totalAmount` decimal(11,2) DEFAULT '0.00',
  `amountDiscount` decimal(8,2) DEFAULT '0.00',
  `percentDisc` decimal(5,2) DEFAULT '0.00',
  `grandTotal` decimal(11,2) DEFAULT '0.00',
  `totalHrs` decimal(10,2) DEFAULT '0.00',
  `email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '',
  `telNum` varchar(30) DEFAULT '',
  `cellNumber` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '',
  `statusRem` varchar(50) DEFAULT '',
  `refId` int DEFAULT '0',
  `editedBy` varchar(50) DEFAULT '0',
  `lastedited` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deliveryRemarks` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quoteStatus`
--

CREATE TABLE `quoteStatus` (
  `statusId` char(10) NOT NULL,
  `step` smallint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quote_details`
--

CREATE TABLE `quote_details` (
  `Id` int NOT NULL,
  `quoteId` int DEFAULT NULL,
  `displayOrder` tinyint NOT NULL,
  `quantity` decimal(10,2) DEFAULT '0.00',
  `width` decimal(10,2) DEFAULT '0.00',
  `height` decimal(10,2) DEFAULT '0.00',
  `unit` char(3) DEFAULT 'IN',
  `material` varchar(20) DEFAULT '',
  `unitPrice` decimal(10,2) DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `amount` decimal(10,2) DEFAULT '0.00',
  `persqft` decimal(10,2) DEFAULT '0.00',
  `itemDescription` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `printHours` decimal(5,1) DEFAULT '0.0',
  `squareFeet` decimal(8,2) NOT NULL DEFAULT '0.00',
  `materialUsage` decimal(10,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `temp`
--

CREATE TABLE `temp` (
  `CLIENT` varchar(100) NOT NULL,
  `CUSTNAME` varchar(255) NOT NULL,
  `EMAIL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `NOTES` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tempPaymentAllocation`
--

CREATE TABLE `tempPaymentAllocation` (
  `id` int NOT NULL,
  `payId` int NOT NULL,
  `orderId` int UNSIGNED NOT NULL,
  `amountApplied` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tempPayments`
--

CREATE TABLE `tempPayments` (
  `payId` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payType` varchar(20) NOT NULL,
  `payReference` varchar(50) DEFAULT NULL,
  `payDate` date NOT NULL,
  `ornum` varchar(15) DEFAULT NULL,
  `postedDate` datetime NOT NULL,
  `transactedBy` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `unit` char(2) NOT NULL,
  `description` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `WTax`
--

CREATE TABLE `WTax` (
  `WTax` varchar(10) NOT NULL,
  `Description` varchar(30) NOT NULL,
  `withVAT` tinyint(1) NOT NULL DEFAULT '1',
  `taxRate` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `client`
--
ALTER TABLE `client`
  ADD PRIMARY KEY (`id`),
  ADD KEY `salesId` (`salesId`);

--
-- Indexes for table `DTRBatches`
--
ALTER TABLE `DTRBatches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `DTREntries`
--
ALTER TABLE `DTREntries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `batchId` (`batchId`);

--
-- Indexes for table `DTRHolidays`
--
ALTER TABLE `DTRHolidays`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `employee`
--
ALTER TABLE `employee`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `Holidays`
--
ALTER TABLE `Holidays`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `invoice`
--
ALTER TABLE `invoice`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `invoicePrefix`
--
ALTER TABLE `invoicePrefix`
  ADD PRIMARY KEY (`invoicePrefix`);

--
-- Indexes for table `jomControl`
--
ALTER TABLE `jomControl`
  ADD PRIMARY KEY (`controlId`);

--
-- Indexes for table `material`
--
ALTER TABLE `material`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_material` (`Material`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`orderId`),
  ADD KEY `clientId` (`clientId`),
  ADD KEY `cellNumber` (`cellNumber`),
  ADD KEY `status` (`status`),
  ADD KEY `idx_orderDate` (`orderDate`),
  ADD KEY `idx_preparedBy` (`preparedBy`),
  ADD KEY `idx_search` (`orderId`,`projectName`,`orderedBy`,`drNum`,`invoiceNum`,`orderReference`),
  ADD KEY `fk_orders_terms` (`terms`);

--
-- Indexes for table `orderStatus`
--
ALTER TABLE `orderStatus`
  ADD PRIMARY KEY (`statusId`);

--
-- Indexes for table `order_details`
--
ALTER TABLE `order_details`
  ADD UNIQUE KEY `unique_order_detail` (`orderId`,`displayOrder`),
  ADD KEY `orderid` (`Id`),
  ADD KEY `material` (`material`);

--
-- Indexes for table `paymentJoAllocation`
--
ALTER TABLE `paymentJoAllocation`
  ADD KEY `fk_pja_payId` (`payId`),
  ADD KEY `fk_pja_orderId` (`orderId`),
  ADD KEY `idx_payment_allocation` (`payId`,`orderId`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payId`),
  ADD KEY `fk_payments_payType` (`payType`),
  ADD KEY `idx_ornum` (`ornum`);

--
-- Indexes for table `paymentTerms`
--
ALTER TABLE `paymentTerms`
  ADD PRIMARY KEY (`terms`);

--
-- Indexes for table `paymentType`
--
ALTER TABLE `paymentType`
  ADD PRIMARY KEY (`payType`);

--
-- Indexes for table `quotes`
--
ALTER TABLE `quotes`
  ADD PRIMARY KEY (`quoteId`),
  ADD KEY `fk_quotes_clientId` (`clientId`),
  ADD KEY `fk_quotes_terms` (`terms`),
  ADD KEY `fk_quotes_status` (`status`);

--
-- Indexes for table `quoteStatus`
--
ALTER TABLE `quoteStatus`
  ADD PRIMARY KEY (`statusId`);

--
-- Indexes for table `quote_details`
--
ALTER TABLE `quote_details`
  ADD PRIMARY KEY (`Id`);

--
-- Indexes for table `tempPaymentAllocation`
--
ALTER TABLE `tempPaymentAllocation`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payId` (`payId`),
  ADD KEY `orderId` (`orderId`);

--
-- Indexes for table `tempPayments`
--
ALTER TABLE `tempPayments`
  ADD PRIMARY KEY (`payId`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`unit`);

--
-- Indexes for table `WTax`
--
ALTER TABLE `WTax`
  ADD PRIMARY KEY (`WTax`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `client`
--
ALTER TABLE `client`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `DTRBatches`
--
ALTER TABLE `DTRBatches`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `DTREntries`
--
ALTER TABLE `DTREntries`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `DTRHolidays`
--
ALTER TABLE `DTRHolidays`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee`
--
ALTER TABLE `employee`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Holidays`
--
ALTER TABLE `Holidays`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice`
--
ALTER TABLE `invoice`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jomControl`
--
ALTER TABLE `jomControl`
  MODIFY `controlId` tinyint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material`
--
ALTER TABLE `material`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `orderId` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_details`
--
ALTER TABLE `order_details`
  MODIFY `Id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payId` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quotes`
--
ALTER TABLE `quotes`
  MODIFY `quoteId` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quote_details`
--
ALTER TABLE `quote_details`
  MODIFY `Id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tempPaymentAllocation`
--
ALTER TABLE `tempPaymentAllocation`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tempPayments`
--
ALTER TABLE `tempPayments`
  MODIFY `payId` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `DTREntries`
--
ALTER TABLE `DTREntries`
  ADD CONSTRAINT `dtrentries_ibfk_1` FOREIGN KEY (`batchId`) REFERENCES `DTRBatches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee`
--
ALTER TABLE `employee`
  ADD CONSTRAINT `employee_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_terms` FOREIGN KEY (`terms`) REFERENCES `paymentTerms` (`terms`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_payType` FOREIGN KEY (`payType`) REFERENCES `paymentType` (`payType`);

--
-- Constraints for table `quotes`
--
ALTER TABLE `quotes`
  ADD CONSTRAINT `fk_quotes_status` FOREIGN KEY (`status`) REFERENCES `quoteStatus` (`statusId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_quotes_terms` FOREIGN KEY (`terms`) REFERENCES `paymentTerms` (`terms`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
