const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Path to the JSON file
const dataFilePath = path.join(__dirname, "data", "records.json");

// Utility function to read JSON data
const readData = () => {
  const data = fs.readFileSync(dataFilePath, "utf8");
  return JSON.parse(data);
};

// Utility function to write JSON data
const writeData = (data) => {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// Utility function to filter records recursively
const filterRecords = (records, query) => {
  const { serialNo, phase, status, document, responsibleParty, updateDate } =
    query;

  return records
    .map((record) => {
      const matchPhase =
        (!serialNo || record.serialNo.toString() === serialNo) &&
        (!phase || record.phase.toLowerCase() === phase.toLowerCase()) &&
        (!status || record.status.toLowerCase() === status.toLowerCase()) &&
        (!document ||
          record.document?.toLowerCase() === document.toLowerCase()) &&
        (!responsibleParty ||
          record.responsibleParty
            .toLowerCase()
            .includes(responsibleParty.toLowerCase())) &&
        (!updateDate || record.updateDate === updateDate);

      const filteredSubPhases = filterRecords(record.subPhases || [], query);

      if (matchPhase || filteredSubPhases.length > 0) {
        return {
          ...record,
          subPhases: filteredSubPhases,
        };
      }

      return null;
    })
    .filter(Boolean);
};

// Routes
// 1. Get all records
app.get("/api/records", (req, res) => {
  const records = readData();
  res.json(records);
});

// 2. Filter records
app.get("/api/records/search", (req, res) => {
  const records = readData();
  const filteredRecords = filterRecords(records, req.query);
  res.json(filteredRecords);
});

// 3. Add a new phase or sub-phase
app.post("/api/records", (req, res) => {
  const { parentSerialNo, newPhase } = req.body; // parentSerialNo is optional
  const records = readData();

  if (parentSerialNo) {
    // Add to sub-phases of the specified parent
    const parent = records.find((record) => record.serialNo === parentSerialNo);
    if (!parent) {
      return res.status(404).json({ error: "Parent phase not found" });
    }
    parent.subPhases.push(newPhase);
  } else {
    // Add as a new phase
    records.push(newPhase);
  }

  writeData(records);
  res.status(201).json({ message: "Phase added successfully", newPhase });
});

// 4. Update a phase or sub-phase
app.put("/api/records/:serialNo", (req, res) => {
  const { serialNo } = req.params;
  const updatedData = req.body;
  const records = readData();

  const updateRecursive = (phases) => {
    return phases.map((phase) => {
      if (phase.serialNo.toString() === serialNo) {
        return { ...phase, ...updatedData };
      }
      if (phase.subPhases) {
        phase.subPhases = updateRecursive(phase.subPhases);
      }
      return phase;
    });
  };

  const updatedRecords = updateRecursive(records);
  writeData(updatedRecords);

  res.json({ message: "Phase updated successfully", updatedData });
});

// 5. Delete a phase or sub-phase
app.delete("/api/records/:serialNo", (req, res) => {
  const { serialNo } = req.params;
  let records = readData();

  const deleteRecursive = (phases) => {
    return phases
      .map((phase) => {
        if (phase.serialNo.toString() === serialNo) {
          return null;
        }
        if (phase.subPhases) {
          phase.subPhases = deleteRecursive(phase.subPhases);
        }
        return phase;
      })
      .filter(Boolean);
  };

  records = deleteRecursive(records);
  writeData(records);

  res.json({ message: "Phase deleted successfully" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
