#!/usr/bin/env node
// Simple helper to generate bcrypt hashes for manual DB user creation
// Usage: node tools/hash-password.js myPlainPassword

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error("Usage: node tools/hash-password.js <password>");
  process.exit(1);
}

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error("Hash error:", err);
    process.exit(1);
  }
  console.log(hash);
});
