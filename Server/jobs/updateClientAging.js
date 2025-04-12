import db from "../utils/db.js";

async function updateClientAging() {
  const now = new Date();

  const [orders] = await db.query(`
    SELECT clientId, grandTotal, amountPaid, productionDate
    FROM orders
    WHERE status = 'Delivered, Billed'
  `);

  const agingMap = new Map();

  for (const order of orders) {
    const { clientId, grandTotal, amountPaid, productionDate } = order;
    const prodDate = new Date(productionDate);
    const days = Math.floor((now - prodDate) / (1000 * 60 * 60 * 24));

    console.log(`Order ${order.id} for client ${clientId}: ${days} days old`);
    if (!agingMap.has(clientId)) {
      agingMap.set(clientId, { "31-60": 0, "61-90": 0, moreThan90: 0 });
    }

    const clientAging = agingMap.get(clientId);

    if (days >= 31 && days <= 60) {
      clientAging["31-60"] += grandTotal - amountPaid;
    } else if (days >= 61 && days <= 90) {
      clientAging["61-90"] += grandTotal - amountPaid;
    } else if (days > 90) {
      clientAging.moreThan90 += grandTotal - amountPaid;
    }
  }

  for (const [clientId, aging] of agingMap.entries()) {
    const [clientRows] = await db
      .promise()
      .query(`SELECT warningDate, holdDate FROM client WHERE id = ?`, [
        clientId,
      ]);
    const client = clientRows[0] || {};

    let warningDate = null;
    let holdDate = null;

    if (aging["61-90"] > 0 || aging.moreThan90 > 0) {
      if (!client.warningDate) warningDate = now;
      if (!client.holdDate) {
        holdDate = new Date();
        holdDate.setDate(now.getDate() + 7);
      }
    }

    await db.promise().query(
      `
      UPDATE client
      SET \`31-60\` = ?, \`61-90\` = ?, \`moreThan90\` = ?,
          warningDate = ?, holdDate = ?
      WHERE id = ?
    `,
      [
        aging["31-60"],
        aging["61-90"],
        aging.moreThan90,
        aging["61-90"] || aging.moreThan90 ? warningDate : null,
        aging["61-90"] || aging.moreThan90 ? holdDate : null,
        clientId,
      ]
    );
  }

  console.log(`[${new Date().toISOString()}] Client aging updated`);
}
export default updateClientAging;
