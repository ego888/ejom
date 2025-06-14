import db from "../utils/db.js";

async function updateClientAging() {
  const now = new Date();

  // Step 1: Load all relevant orders
  const [orders] = await db.query(`
    SELECT orderId, clientId, grandTotal, amountPaid, productionDate
    FROM orders
    WHERE status IN ('Prod', 'Finished', 'Delivered', 'Billed')
  `);

  const agingMap = new Map();

  // Step 2: Populate agingMap with over30/60/90 per client
  for (const order of orders) {
    const { clientId, grandTotal, amountPaid, productionDate } = order;
    if (!clientId || !productionDate) continue;

    const grand = parseFloat(grandTotal);
    const paid = parseFloat(amountPaid || 0);
    const balance = grand - paid;

    if (isNaN(grand) || isNaN(paid) || balance <= 0) continue;

    const days = Math.floor(
      (now - new Date(productionDate)) / (1000 * 60 * 60 * 24)
    );

    if (!agingMap.has(clientId)) {
      agingMap.set(clientId, { over30: 0, over60: 0, over90: 0 });
    }

    const clientAging = agingMap.get(clientId);

    if (days >= 31 && days <= 60) {
      clientAging.over30 += balance;
    } else if (days >= 61 && days <= 90) {
      clientAging.over60 += balance;
    } else if (days > 90) {
      clientAging.over90 += balance;
    }
  }

  // Step 3: Get all clients with Delivered/Billed orders (even if fully paid)
  const [allClients] = await db.query(`
    SELECT DISTINCT clientId
    FROM orders
    WHERE status IN ('Delivered', 'Billed') AND clientId IS NOT NULL
  `);

  let updatedCount = 0;

  for (const { clientId } of allClients) {
    const aging = agingMap.get(clientId) || { over30: 0, over60: 0, over90: 0 };

    const aging31_60 = isNaN(aging.over30) ? 0 : aging.over30;
    const aging61_90 = isNaN(aging.over60) ? 0 : aging.over60;
    const agingOver90 = isNaN(aging.over90) ? 0 : aging.over90;
    const totalAging = aging31_60 + aging61_90 + agingOver90;

    const [clientRows] = await db.query(
      `SELECT c.overdue, c.hold, c.terms, pt.days as termsDays
       FROM client c
       LEFT JOIN paymentTerms pt ON c.terms = pt.terms
       WHERE c.id = ?`,
      [clientId]
    );
    const client = clientRows[0] || {};
    client.termsDays = client.termsDays != null ? client.termsDays : 0;

    const [oldestUnpaid] = await db.query(
      `SELECT MIN(productionDate) as oldestProdDate
       FROM orders
       WHERE clientId = ? AND status IN ('Delivered', 'Billed') AND (grandTotal - amountPaid) > 0`,
      [clientId]
    );

    const oldestProductionDate = oldestUnpaid[0]?.oldestProdDate
      ? new Date(oldestUnpaid[0].oldestProdDate)
      : null;

    let overdue = null;
    let hold = null;

    if (totalAging > 0 && oldestProductionDate) {
      overdue = new Date(oldestProductionDate);
      overdue.setDate(overdue.getDate() + client.termsDays);
      overdue = overdue.toISOString().slice(0, 19).replace("T", " ");

      hold = new Date(overdue);
      hold.setDate(hold.getDate() + 30);
      hold = hold.toISOString().slice(0, 19).replace("T", " ");

      const currentHold = new Date(client.hold);
      if (!isNaN(currentHold) && currentHold > new Date(hold)) {
        hold = currentHold.toISOString().slice(0, 19).replace("T", " ");
      }

      console.log(`🧾 Setting overdue/hold for client ${clientId}`);
    } else {
      console.log(`ℹ️ Cleared overdue/hold for clientId: ${clientId}`);
    }
    if (clientId === 3460) {
      console.log("aging31_60", aging31_60);
      console.log("aging61_90", aging61_90);
      console.log("agingOver90", agingOver90);
      console.log("totalAging", totalAging);
      console.log("oldestProductionDate", oldestProductionDate);
      console.log("client.termsDays", client.termsDays);
      console.log("overdue", overdue);
      console.log("hold", hold);
    }

    const [result] = await db.query(
      `
      UPDATE client
      SET \`over30\` = ?, \`over60\` = ?, \`over90\` = ?,
          overdue = ?, hold = ?
      WHERE id = ?
      `,
      [aging31_60, aging61_90, agingOver90, overdue, hold, clientId]
    );

    if (result.affectedRows > 0) {
      updatedCount++;
    }
  }

  console.log(`📊 Total clients updated: ${updatedCount}`);

  // Step 4: Auto-close logic
  const [closedResult] = await db.query(`
    UPDATE orders 
    SET log = CONCAT(NOW(), CHAR(13), CHAR(10), status, ' to Closed.',CHAR(13), CHAR(10), COALESCE(log, '')),
        status = 'Closed'
    WHERE status IN ('Delivered', 'Billed') 
      AND amountPaid >= grandTotal AND grandTotal > 0
  `);
  if (closedResult.affectedRows > 0) {
    console.log(`🔒 Closed ${closedResult.affectedRows} fully paid orders`);
  }

  const [staleProdResult] = await db.query(`
    UPDATE orders 
    SET log = CONCAT(NOW(), CHAR(13), CHAR(10), status, ' to Closed.',CHAR(13), CHAR(10), COALESCE(log, '')),
        status = 'Closed'
    WHERE status IN ('Prod', 'Finished') 
      AND productionDate IS NOT NULL
      AND productionDate <= DATE_SUB(NOW(), INTERVAL 15 DAY)
      AND amountPaid >= grandTotal AND grandTotal > 0
  `);
  if (staleProdResult.affectedRows > 0) {
    console.log(
      `⏰ Closed ${staleProdResult.affectedRows} fully paid stale production orders (15+ days old)`
    );
  }

  const [staleOpenResult] = await db.query(`
    UPDATE orders 
    SET log = CONCAT(NOW(), CHAR(13), CHAR(10), status, ' to Closed.',CHAR(13), CHAR(10), COALESCE(log, '')),
        status = 'Closed'
    WHERE status IN ('Open', 'Printed') 
      AND lastEdited IS NOT NULL
      AND lastEdited <= DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND amountPaid >= grandTotal AND grandTotal > 0
  `);
  if (staleOpenResult.affectedRows > 0) {
    console.log(
      `⏰ Closed ${staleOpenResult.affectedRows} fully paid stale open orders (30+ days old)`
    );
  }

  console.log("✅ Aging update complete.");
}

export default updateClientAging;
