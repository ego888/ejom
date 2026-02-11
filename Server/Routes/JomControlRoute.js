import express from "express";
import pool from "../utils/db.js";
import { verifyUser, authorize } from "../middleware.js";

const router = express.Router();

// Get company control info
router.get("/jomcontrol", async (req, res) => {
  try {
    const sql = "SELECT * FROM jomControl LIMIT 1";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching company control:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.get("/jomcontrol/lastDR", async (req, res) => {
  try {
    const sql = "SELECT lastDrNumber FROM jomControl LIMIT 1";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching company control:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// get VAT%
router.get("/jomcontrol/VAT", async (req, res) => {
  try {
    const sql = "SELECT vatPercent FROM jomControl LIMIT 1";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching company control:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get artist incentive settings
router.get("/jomcontrol/artistIncentive", verifyUser, async (req, res) => {
  try {
    const sql = `
      SELECT 
        vatPercent,
        major,
        minor,
        ArtistMaxPercent,
        ArtistMinAmount,
        HalfIncentiveSqFt
      FROM jomControl 
      LIMIT 1
    `;

    const [result] = await pool.query(sql);
    return res.json({
      Status: true,
      Result: result[0],
    });
  } catch (err) {
    console.error("Error fetching artist incentive settings:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch artist incentive settings: " + err.message,
    });
  }
});

// get sales incentive, override incentive, max sales incentive
router.get("/jomcontrol/salesIncentive", async (req, res) => {
  try {
    const sql =
      "SELECT salesIncentive, overrideIncentive, HalfIncentiveSqFt, vatPercent FROM jomControl LIMIT 1";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching company control:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Update editable control fields (admin only)
router.put(
  "/jomcontrol/edit",
  verifyUser,
  authorize("admin"),
  async (req, res) => {
    try {
      const [existingRows] = await pool.query(
        "SELECT controlId FROM jomControl LIMIT 1"
      );

      if (!existingRows.length) {
        return res.json({
          Status: false,
          Error: "No jomControl record found",
        });
      }

      const controlId = existingRows[0].controlId;

      const toNullableString = (value) => {
        if (value === undefined || value === null) return null;
        const trimmed = String(value).trim();
        return trimmed === "" ? null : trimmed;
      };

      const toNumber = (value, defaultValue = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : defaultValue;
      };

      const quoteDelivery = String(req.body.quoteDelivery ?? "").trim();
      const quoteApproval = String(req.body.quoteApproval ?? "").trim();

      if (!quoteDelivery || !quoteApproval) {
        return res.json({
          Status: false,
          Error: "Quote Delivery and Quote Approval are required",
        });
      }

      const sql = `
      UPDATE jomControl
      SET
        companyName = ?,
        companyAddress1 = ?,
        companyAddress2 = ?,
        companyPhone = ?,
        companyEmail = ?,
        soaName = ?,
        vatPercent = ?,
        quoteDelivery = ?,
        quoteApproval = ?,
        bankInfo = ?,
        salesIncentive = ?,
        overrideIncentive = ?,
        HalfIncentiveSqFt = ?,
        ArtistMaxPercent = ?,
        major = ?,
        minor = ?,
        ArtistMinAmount = ?
      WHERE controlId = ?
    `;

      const values = [
        toNullableString(req.body.companyName),
        toNullableString(req.body.companyAddress1),
        toNullableString(req.body.companyAddress2),
        toNullableString(req.body.companyPhone),
        toNullableString(req.body.companyEmail),
        toNullableString(req.body.soaName),
        toNumber(req.body.vatPercent, 0),
        quoteDelivery,
        quoteApproval,
        toNullableString(req.body.bankInfo),
        toNumber(req.body.salesIncentive, 0),
        toNumber(req.body.overrideIncentive, 0),
        toNumber(req.body.HalfIncentiveSqFt, 0),
        toNumber(req.body.ArtistMaxPercent, 0),
        Math.trunc(toNumber(req.body.major, 0)),
        Math.trunc(toNumber(req.body.minor, 0)),
        toNumber(req.body.ArtistMinAmount, 0),
        controlId,
      ];

      await pool.query(sql, values);
      return res.json({ Status: true });
    } catch (err) {
      console.error("Error updating company control:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
  }
);

export { router as JomControlRouter };
