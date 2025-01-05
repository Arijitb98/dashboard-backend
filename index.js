const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const client = require("./db");

const app = express();
const PORT = 5000;

const USE_DB = process.env.USE_DB === "true";

app.use(bodyParser.json());
app.use(cors());

// Fetch all phases with their sub-phases
const fetchAllRecords = async () => {
  if (USE_DB) {
    const phasesQuery = `
      SELECT p.*, 
        COALESCE(json_agg(sp.*) FILTER (WHERE sp.id IS NOT NULL), '[]') AS subphases
      FROM phases p
      LEFT JOIN sub_phases sp ON p.id = sp.phase_id
      GROUP BY p.id;
    `;

    const result = await client.query(phasesQuery);
    return result.rows;
  }

  throw new Error("Local JSON handling is not implemented here.");
};

// To add a new phase
const addPhase = async (phase) => {
  const query = `
    INSERT INTO phases (serialno, phase, status, document, responsibleparty, updatedate)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    phase.serialNo,
    phase.phase,
    phase.status,
    phase.document,
    phase.responsibleParty,
    phase.updateDate,
  ];

  const result = await client.query(query, values);
  return result.rows[0];
};

// To add a new sub-phase
const addSubPhase = async (subPhase, phaseId) => {
  const query = `
    INSERT INTO sub_phases (serialno, phase, status, document, responsibleparty, updatedate, phase_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    subPhase.serialNo,
    subPhase.phase,
    subPhase.status,
    subPhase.document,
    subPhase.responsibleParty,
    subPhase.updateDate,
    phaseId,
  ];

  const result = await client.query(query, values);
  return result.rows[0];
};

// Routes
app.get("/api/records", async (req, res) => {
  try {
    const records = await fetchAllRecords();
    res.json(records);
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

app.post("/api/records", async (req, res) => {
  const { parentSerialNo, newPhase } = req.body;

  try {
    if (parentSerialNo) {
      const parentResult = await client.query(
        "SELECT id FROM phases WHERE serialno = $1",
        [parentSerialNo]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: "Parent phase not found" });
      }

      const parentId = parentResult.rows[0].id;
      const addedSubPhase = await addSubPhase(newPhase, parentId);
      res
        .status(201)
        .json({ message: "Sub-phase added successfully", addedSubPhase });
    } else {
      const addedPhase = await addPhase(newPhase);
      res.status(201).json({ message: "Phase added successfully", addedPhase });
    }
  } catch (error) {
    console.error("Error adding phase:", error);
    res.status(500).json({ error: "Failed to add phase" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
