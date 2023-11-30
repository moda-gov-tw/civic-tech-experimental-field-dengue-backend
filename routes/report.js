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

router.post("/:addressID", async (req, res) => {
  let report = req.body.report || {};
  let addressID = req.params.addressID;
  let address = await model.Common.find("addresses", { _id: addressID });
  if (address) {
    await model.Common.update("addresses", { _id: addressID }, { report });
    logger(`編輯作業`, { 地址: address.地址, report }, req.user);
  }
  res.json();
});

router.post("/:addressID/:key", async (req, res) => {
  let defaultValue = {
    preCheck: {},
    spray: { 積水容器: [] },
    files: [],
    note: "",
  };
  let key = req.params.key;
  let report = req.body.report || defaultValue[key];
  let addressID = req.params.addressID;
  let payload = {};
  payload[`report.${key}`] = report;

  let address = await model.Common.find("addresses", { _id: addressID });
  if (address) {
    await model.Common.update("addresses", { _id: addressID }, payload);
    logger(`編輯作業`, { 地址: address.地址, payload }, req.user);
  }

  res.json();
});

module.exports = router;
