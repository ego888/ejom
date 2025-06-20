import db from "../utils/db.js";

async function updateClientAging() {
  const now = new Date();

  // ✅ Step 1: Load all relevant orders (with required statuses and grandTotal > 0)
  const [orders] = await db.query(`
    SELECT orderId, clientId, grandTotal, amountPaid, productionDate
    FROM orders
    WHERE status IN ('Prod', 'Finished', 'Delivered', 'Billed')
      AND grandTotal > 0
  `);

  // ✅ Step 2: Build per-client aging data from orders
  const agingMap = new Map();

  for (const order of orders) {
    const { clientId, grandTotal, amountPaid, productionDate } = order;
    if (!clientId || !productionDate) continue;

    const grand = parseFloat(grandTotal);
    const paid = parseFloat(amountPaid || 0);
    const balance = grand - paid;

    if (balance <= 0) continue;

    const daysOld = Math.floor(
      (now - new Date(productionDate)) / (1000 * 60 * 60 * 24)
    );

    if (!agingMap.has(clientId)) {
      agingMap.set(clientId, {
        within30: 0,
        over30: 0,
        over60: 0,
        over90: 0,
        oldestDate: new Date(productionDate),
      });
    }

    const clientAging = agingMap.get(clientId);

    // Categorize the balance by aging bracket
    if (daysOld <= 30) {
      clientAging.within30 += balance;
    } else if (daysOld <= 60) {
      clientAging.over30 += balance;
    } else if (daysOld <= 90) {
      clientAging.over60 += balance;
    } else {
      clientAging.over90 += balance;
    }

    // Track oldest unpaid productionDate for overdue calculation
    const prodDate = new Date(productionDate);
    if (prodDate < clientAging.oldestDate) {
      clientAging.oldestDate = prodDate;
    }
  }

  // ✅ Step 3: Get all client info (including termsDays) in one query
  const [clients] = await db.query(`
    SELECT c.id, c.overdue, c.hold, c.terms, pt.days AS termsDays
    FROM client c
    LEFT JOIN paymentTerms pt ON c.terms = pt.terms
  `);

  const clientInfoMap = new Map(clients.map((c) => [c.id, c]));

  // ✅ Step 4: Get all clients who have qualifying orders
  const [allClients] = await db.query(`
    SELECT DISTINCT clientId
    FROM orders
    WHERE status IN ('Prod', 'Finished', 'Delivered', 'Billed')
      AND clientId IS NOT NULL
  `);

  let updatedCount = 0;

  // ✅ Step 5: Process each client
  for (const { clientId } of allClients) {
    const aging = agingMap.get(clientId) || {
      within30: 0,
      over30: 0,
      over60: 0,
      over90: 0,
      oldestDate: null,
    };

    const { over30, over60, over90, oldestDate } = aging;

    // Get preloaded client info
    const client = clientInfoMap.get(clientId) || {};
    const termsDays = client.termsDays != null ? client.termsDays : 0;

    let overdue = null;
    let hold = null;

    // ✅ Step 6: Calculate overdue and hold if there's an unpaid order
    if (oldestDate) {
      overdue = new Date(oldestDate);
      overdue.setDate(overdue.getDate() + termsDays);
      overdue = overdue.toISOString().slice(0, 19).replace("T", " ");

      hold = new Date(overdue);
      hold.setDate(hold.getDate() + 30);
      hold = hold.toISOString().slice(0, 19).replace("T", " ");

      // Optional: use later hold if existing one is further
      const currentHold = new Date(client.hold);
      if (!isNaN(currentHold) && currentHold > new Date(hold)) {
        hold = currentHold.toISOString().slice(0, 19).replace("T", " ");
      }

      console.log(`🧾 Setting overdue/hold for client ${clientId}`);
    } else {
      console.log(`ℹ️ Cleared overdue/hold for client ${clientId}`);
    }

    // ✅ Step 7: Update client aging and dates
    const [result] = await db.query(
      `
      UPDATE client
      SET \`over30\` = ?, \`over60\` = ?, \`over90\` = ?,
          overdue = ?, hold = ?
      WHERE id = ?
      `,
      [
        isNaN(over30) ? 0 : over30,
        isNaN(over60) ? 0 : over60,
        isNaN(over90) ? 0 : over90,
        overdue,
        hold,
        clientId,
      ]
    );

    if (result.affectedRows > 0) {
      updatedCount++;
    }
  }

  console.log(`📊 Total clients updated: ${updatedCount}`);

  // ✅ Step 8: Auto-close logic (left unchanged)
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

  // ✅ Step 9: Auto-deliver logic for old production orders
  const [autoDeliverResult] = await db.query(`
    UPDATE orders 
    SET log = CONCAT(NOW(), CHAR(13), CHAR(10), status, ' to Delivered.',CHAR(13), CHAR(10), COALESCE(log, '')),
        status = 'Delivered'
    WHERE status IN ('Prod', 'Finished') 
      AND productionDate IS NOT NULL
      AND productionDate <= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `);
  if (autoDeliverResult.affectedRows > 0) {
    console.log(
      `🚚 Auto-delivered ${autoDeliverResult.affectedRows} production orders (30+ days old)`
    );
  }
}

export default updateClientAging;
