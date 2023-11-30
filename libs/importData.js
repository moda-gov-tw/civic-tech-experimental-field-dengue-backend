const DEBUG = false;
const csv = require("csvtojson");
const _ = require("lodash");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const iconv = require("fs-iconv");
const languageEncoding = require("detect-file-encoding-and-language");

async function importData(filePath, remove = true) {
  let ext = path.extname(filePath);
  let filePaths = [];
  let result = [];

  if ([".xls", ".xlsx"].includes(ext)) {
    filePaths = toCSV(filePath);
    DEBUG && console.log("Transfer complete!");
  } else {
    filePaths.push(filePath);
  }

  for await (let filePath of filePaths) {
    let fileInfo = await languageEncoding(filePath);
    DEBUG && console.log(fileInfo);
    if (
      fileInfo.encoding != "UTF-8" &&
      fileInfo.language != "chinese-simplified"
      // || fileInfo.language == "norwegian"
    ) {
      let content = await iconv.loadFile(filePath, {
        encoding: "big5",
      });
      await iconv.saveFile(filePath, content, {
        encoding: "UTF-8",
      });
      DEBUG && console.log("Encoding complete!");
    }

    let arr = await csv({ flatKeys: true })
      .preRawData((csvRawData) => {
        var newData = csvRawData.replace("﻿", "");
        return newData;
      })
      .fromFile(filePath);

    arr = await csv().fromFile(filePath);
    result = result.concat(arr);
    if (remove) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
    }
  }

  if (remove) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {}
  }
  result = trim(result);
  return result;
}

function removeLines(filePath, shift = 0, pop = 0) {
  let csvContent = fs.readFileSync(filePath).toString().split("\n");
  for (let n = 0; n < shift; n++) {
    csvContent.shift();
  }
  for (let n = 0; n < pop; n++) {
    csvContent.pop();
  }
  csvContent = csvContent.join("\n");
  fs.writeFileSync(filePath, csvContent);
}

function trim(arr) {
  let keys = Object.keys(arr[0]);
  // if (keys.includes("身分證號")) {
  //   arr = arr.filter((row) => row.身分證號);
  // }

  arr = arr.map((obj) => {
    return _.mapValues(obj, (value) => {
      return value.replace ? value.replace(/[\*\']/g, "") : "";
    });
  });
  return arr;
}

function toCSV(filePath) {
  let ext = path.extname(filePath);
  let workBook = XLSX.readFile(filePath, { dense: true, cellFormula: false });
  let sheets = workBook.SheetNames;

  sheets.forEach((sheet) => {
    sheetFilePath = filePath.replace(ext, `-${sheet}.csv`);
    try {
      fs.unlinkSync(sheetFilePath);
    } catch (e) {}
    XLSX.writeFile(workBook, sheetFilePath, {
      bookType: "csv",
      sheet: sheet,
    });
  });

  return sheets.map((sheet) => filePath.replace(ext, `-${sheet}.csv`));
}

module.exports = importData;
