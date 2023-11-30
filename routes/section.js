const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const axios = require("axios");
const dayjs = require("dayjs");
const _ = require("lodash");
const multer = require("multer");
const XLSX = require("xlsx");
const rateLimit = require("express-rate-limit");
const JSZip = require("jszip");
const fs = require("fs");
const { tokenRequire, mapObject } = require("../libs/util");
const logger = require("../libs/logger.js");
const model = require("../model");
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

router.get("/", async (req, res) => {
  let sections = await model.Common.list("sections");
  sections = sections.map((section) => mapObject("section", section));
  res.json(sections);
});

router.get("/:section/address", async (req, res) => {
  let section = req.params.section;
  let query = {
    場次: section,
  };

  let addresses = await model.Common.list("addresses", query);
  addresses = addresses.map((address) => mapObject("address", address));
  res.json(addresses);
});

router.get("/:section/files", async (req, res) => {
  try {
    let section = req.params.section;
    let zip = new JSZip();
    var img = zip.folder(section);
    let addresses = await model.Common.list("addresses", { 場次: section });
    addresses = addresses
      .map((o) => {
        let files = o.report?.files || [];
        files = files.map((file) => {
          let path = "./" + file.url.replace(process.env.FILEBASE, "");
          let fileName = `${o.地址}-${file.type}-${path.split("/").pop()}`;
          return {
            fileName,
            content: fs.readFileSync(path, {
              encoding: "base64",
            }),
          };
        });
        return files;
      })
      .flat();

    addresses.forEach((file) => {
      img.file(file.fileName, file.content, { base64: true });
    });
    let buffer = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader(
      "Content-disposition",
      `attachment; filename=${encodeURIComponent(section)}.zip`
    );
    res.setHeader("Content-type", "application/zip");
    res.send(buffer);
  } catch (error) {
    console.log(error);
    res.json();
  }
});

router.post("/:_id", async (req, res) => {
  let _id = req.params._id;
  let section = req.body;
  delete section._id;
  section.updatedAt = dayjs().format("YYYY-MM-DD HH:mm:ss");
  await model.Common.update("sections", { _id }, section);
  logger(`編輯場次`, section, req.user);
  res.json();
});

router.delete("/:section/reset", async (req, res) => {
  let section = req.params.section;
  let list = await model.Common.list("addresses", { 場次: section });
  for await (let row of list) {
    await model.Common.update(
      "addresses",
      { _id: row._id },
      {
        report: {
          preCheck: {},
          spray: { 積水容器: [] },
          files: [],
          note: row?.report?.note || null,
        },
      }
    );
  }
  logger(`重設場次`, { 場次: section }, req.user);
  res.json();
});

router.delete("/:section", async (req, res) => {
  let section = req.params.section;
  await model.Common.delete("sections", { section });
  await model.Common.delete("addresses", { 場次: section });
  logger(`刪除場次`, { 場次: section }, req.user);
  res.json();
});

router.post("/", multer().single("file"), async (req, res) => {
  let section = req.body.section.replace("\t", "");
  let date = req.body.date;
  let addresses;
  if (req.file) {
    let workBook = XLSX.read(req.file.buffer, { type: "buffer" });
    let workSheet = workBook.Sheets[workBook.SheetNames[0]];
    addresses = XLSX.utils.sheet_to_json(workSheet);
    let 組別 = "";
    let address = addresses.map((row) => {
      if (row.備註) {
        row.report = {
          preCheck: {},
          spray: { 積水容器: [] },
          files: [],
          note: row.備註,
        };
      }
      delete row.備註;

      if (row.序號) {
        row.順序 = row.序號;
        delete row.序號;
      }

      row.組別 = (row.組別 || 組別) + "";
      組別 = row.組別;
      row.createdAt = dayjs().format("YYYY-MM-DD HH:mm:ss");
      row.場次 = section;
      row.日期 = date;
      row.地址 =
        `${row.區別 || ""}${row.里別 || ""}${row.路 || ""}${row.巷 || ""}${
          row.弄 || ""
        }${row.號 || ""}` || `${row.地址}`;
      return row;
    });

    let originList = await model.Common.list("addresses", { 場次: section });
    address.forEach((row) => {
      let originMatch = originList.find((o) => o.地址 === row.地址);
      if (originMatch) {
        originMatch.組別 = row.組別 || originMatch.組別;
        originMatch.順序 = row.順序 || originMatch.順序;
        // if (row?.report?.note) {
        //   originMatch.report.note = row.report.note || originMatch.report.note;
        // }
      } else {
        originList.push(row);
      }
    });
    originList.forEach((row) => {
      delete row._id;
    });

    await model.Common.delete("addresses", { 場次: section });
    await model.Common.insert("addresses", originList);
  }

  addresses = await model.Common.list("addresses", { 場次: section });
  try {
    await model.Common.insert("sections", {
      section,
      date,
      count: addresses.length,
      createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    });
  } catch (error) {
    await model.Common.update(
      "sections",
      { section },
      { count: addresses.length, date }
    );
  }
  logger(`增修場次`, { 場次: section, count: addresses.length }, req.user);
  res.json();
});

router.get("/:section/addresses", async (req, res) => {
  let section = req.params.section;
  let addresses = await model.Common.list(
    "addresses",
    { 場次: section },
    { 組別: 1, 順序: 1 }
  );
  addresses = addresses.map((row) => {
    return {
      地址: row.地址,
      區別: row.區別,
      里別: row.里別,
      路: row.路,
      巷: row.巷,
      弄: row.弄,
      號: row.號,
      組別: row.組別,
      順序: row.順序,
      備註: row?.report?.note || "",
    };
  });
  let workBook = XLSX.utils.book_new();
  let workSheet = XLSX.utils.json_to_sheet(addresses);
  XLSX.utils.book_append_sheet(workBook, workSheet, "地址");
  let buffer = XLSX.write(workBook, { type: "buffer" });
  res.setHeader(
    "Content-disposition",
    `attachment; filename=${encodeURIComponent(section)}.xlsx`
  );
  res.setHeader(
    "Content-type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(buffer);
});

module.exports = router;
