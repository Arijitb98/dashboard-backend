const { Client } = require("pg");
const fs = require("fs");
require("dotenv").config();

const client = new Client({
  host: process.env.DB_HOST_ONLINE,
  port: process.env.DB_PORT_ONLINE,
  user: process.env.DB_USER_ONLINE,
  password: process.env.DB_PASSWORD_ONLINE,
  database: process.env.DB_NAME_ONLINE,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(process.env.DB_SSL_CA).toString(),
  },
});

client.connect((err) => {
  if (err) {
    console.error("Failed to connect to the database:", err.stack);
  } else {
    console.log("Connected to the PostgreSQL database");
  }
});

module.exports = client;
