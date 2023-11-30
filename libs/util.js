const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");
const _ = require("lodash");

module.exports.mapObject = (type, obj, includes = [], skip = []) => {
  switch (type) {
    case "address":
      includes = _.concat((includes, []));
      break;
    case "section":
      includes = _.concat((includes, []));
      break;
  }
  let result = {};
  for (let key in obj) {
    if (skip.includes(key)) continue;
    if (includes.length && !includes.includes(key)) continue;
    result[key] = obj[key];
  }
  return result;
};

module.exports.acl = (roles) => {
  return (req, res, next) => {
    try {
      if (!roles) {
        next();
      }
      if (!Array.isArray(roles) && roles) {
        roles = [roles];
      }
      if (roles.includes(req.user.role)) {
        next();
      } else {
        throw "權限失敗";
      }
    } catch (e) {
      res.status(401).end();
    }
  };
};

module.exports.userGroup = {
  管理者: ["管理者", "衛生局管理者", "衛生所管理者"],
  衛生局管理者: ["管理者", "衛生局管理者"],
  衛生局: ["管理者", "衛生局管理者", "衛生局"],
  衛生所管理者: ["管理者", "衛生局管理者", "衛生所管理者"],
  衛生所: ["管理者", "衛生局管理者", "衛生局", "衛生所管理者", "衛生所"],
  醫事單位: [
    "管理者",
    "衛生局管理者",
    "衛生局",
    "衛生所管理者",
    "衛生所",
    "醫事單位",
  ],
  all: [
    "管理者",
    "衛生局管理者",
    "衛生局",
    "衛生所管理者",
    "衛生所",
    "醫事單位",
  ],
  none: [],
};

module.exports.getUser = (req, res, next) => {
  try {
    let token = req.headers.authorization.split(" ")[1];
    let user = jwt.verify(token, process.env.SALT);
    delete user.iat;
    delete user.exp;
    req.user = user;
    next();
  } catch (e) {
    next();
  }
};

module.exports.tokenRequire = (req, res, next) => {
  try {
    let user = req.user;
    if ((!user.user && !user.account) || !user.role) throw "驗證失敗";
    next();
  } catch (e) {
    res.status(401).end();
  }
};
