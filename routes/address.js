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

router.get("/:id", async (req, res) => {
  let id = req.params.id;
  let address = await model.Common.find("addresses", { _id: id });
  address = mapObject("address", address);
  res.json(address);
});

router.post("/search", async (req, res) => {
  let { section, keyword, condition } = req.body;
  let query = { $and: [] };
  if (section) {
    query.$and.push({ 場次: section });
  }
  if (keyword) {
    query.$and.push({
      $or: [
        { 地址: { $regex: keyword } },
        { "report.spray.reporter": { $regex: keyword } },
        { "report.spray.鎖匠姓名.value": { $regex: keyword } },
        { "report.spray.員警姓名.value": { $regex: keyword } },
        { "report.spray.噴藥人員": { $regex: keyword } },
      ],
    });
  }
  if (condition.陽性) {
    query.$and.push({
      "report.spray.積水容器": { $elemMatch: { 陽性: true } },
    });
  }
  if (condition.開鎖) {
    query.$and.push({
      "report.spray.執行開鎖": true,
    });
  }
  if (condition.補噴) {
    query.$and.push({
      $or: [
        { "report.spray.action": "部分噴射" },
        { "report.spray.action": "無噴射" },
      ],
    });
  }
  if (query.$and.length === 0) {
    query = {};
  }

  let addresses = await model.Common.list("addresses", query);
  addresses = addresses.map((address) => mapObject("address", address));
  logger(`綜合搜尋`, req.body, req.user);
  res.json(addresses);
});

router.post("/", async (req, res) => {
  let address = req.body.address || [];
  let section = req.body.section || "";
  address = address.map((row) => {
    row.createdAt = dayjs().format("YYYY-MM-DD HH:mm:ss");
    row.場次 = section;
    row.地址 = `${row.區別 || ""}${row.里別 || ""}${row.路 || ""}${
      row.巷 || ""
    }${row.弄 || ""}${row.號 || ""}`;
    return row;
  });

  if (address.filter((o) => !o._id).length) {
    await model.Common.insert(
      "addresses",
      address.filter((o) => !o._id)
    );
    logger(`新增地址`, req.body, req.user);
  }

  if (address.filter((o) => o._id).length) {
    for await (row of address.filter((o) => o._id)) {
      await model.Common.update("addresses", { _id: row._id }, row);
      logger(`編輯地址`, req.body, req.user);
    }
  }

  res.json();
});

router.delete("/:addressID", async (req, res) => {
  let addressID = req.params.addressID;
  let address = await model.Common.find("addresses", { _id: addressID });
  if (address) {
    await model.Common.delete("addresses", { _id: addressID });
  }

  logger(`刪除地址`, { 地址: address.地址 }, req.user);
  res.json();
});

module.exports = router;
