const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const axios = require("axios");
const dayjs = require("dayjs");
const _ = require("lodash");
const rateLimit = require("express-rate-limit");
const { tokenRequire, mapObject } = require("../libs/util");
const logger = require("../libs/logger.js");
const model = require("../model");
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

router.post("/", async (req, res) => {
  let ip = req.ipInfo.ip;
  let user = req.user;
  let data = req.body;
  let payload = {
    ...data,
    ip,
    createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
  };
  await model.Common.insert("signs", payload);
  res.json({
    token: jwt.sign(
      {
        ...user,
        name: data.name,
        createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      },
      process.env.SALT
    ),
  });
});

router.get("/:section", async (req, res) => {
  let section = req.params.section;
  let signs = await model.Common.list("signs", { section });
  res.json(signs);
});

module.exports = router;
