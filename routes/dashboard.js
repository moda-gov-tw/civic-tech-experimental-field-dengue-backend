const express = require("express");
const router = express.Router();
const dayjs = require("dayjs");
const apicache = require("apicache");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const fs = require("fs");
const { tokenRequire } = require("../libs/util");
const model = require("../model");
const logger = require("../libs/logger.js");
const users = require("../mock/users.json");

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

router.get("/me", tokenRequire, async (req, res) => {
  let user = req.user;
  res.json(user);
});

router.post("/login", async (req, res) => {
  let user = req.user;
  let data = req.body;
  // data.password = bcrypt.hashSync(data.password, 10);
  // console.log(data.password);

  // 未來改成用資料庫
  let findedUser = _.find(users, { account: data.account });
  if (!findedUser || !bcrypt.compareSync(data.password, findedUser.password)) {
    logger(`登入失敗`, {}, req.user);
    res.status(401).end();
    return;
  }
  logger(`登入成功`, {}, data.account);
  res.json({
    token: jwt.sign(
      {
        ...user,
        account: data.account,
        role: findedUser.role,
        acl: findedUser.acl,
        createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      },
      process.env.SALT
    ),
  });
});

router.get("/log/:date", async (req, res) => {
  try {
    let n = 1;
    let date = req.params.date;

    let logs = fs
      .readFileSync(`./logs/info.${date}.log`, "utf8")
      .toString()
      .split("\n");

    logs = logs.filter((o) => o);
    logs = logs.map((row) => {
      let obj = row.split("|");
      let first = obj.shift();
      let last = obj.pop();
      let content = obj.join("|");
      return {
        index: n++,
        time: dayjs(first.split(" ")[0].replace(/[\[\]]/g, "")).format(
          "YYYY-MM-DD HH:mm:ss"
        ),
        action: first.split(" ")[4],
        content: content.includes("{") ? JSON.parse(content) : content,
        from: last,
      };
    });
    res.json(logs);
  } catch (error) {
    res.json([]);
  }
});

module.exports = router;
