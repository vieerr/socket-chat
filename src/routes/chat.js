const express = require("express");
const path = require("path");

const requireAuth = require("../middleware/auth");

const router = express.Router();
const VIEWS_DIR = path.join(__dirname, "../views");

router.get("/", requireAuth, (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, "index.html"));
});

router.get("/register", (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, "register.html"));
});

module.exports = router;
