const DEBUG = false;

const multer = require("multer");
const express = require("express");
const router = express.Router();
const path = require("path");
const dayjs = require("dayjs");
const _ = require("lodash");
const model = require("../model");
const DB = require("../libs/db");
const util = require("../libs/util");
const logger = require("../libs/logger.js");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, callback) => {
    // var ext = path.extname(file.originalname).toLowerCase();
    // if (ext !== ".xls" && ext !== ".xlsx" && ext !== ".csv") {
    //   return callback(new Error("Only limited file extensions allowed"));
    // }
    callback(null, true);
  },
});

let uploads = upload.fields([{ name: "file" }]);

router.post("/", uploads, async (req, res) => {
  let url = `${process.env.FILEBASE}${req.files.file[0].path}`;
  res.send({ url });
});

module.exports = router;
