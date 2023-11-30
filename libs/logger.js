const log4js = require("log4js");
log4js.configure({
  disableClustering: true,
  appenders: {
    default: {
      type: "dateFile",
      filename: "logs/info",
      pattern: "yyyy-MM-dd.log",
      alwaysIncludePattern: true,
      category: "normal",
      numBackups: 60,
      daysToKeep: 60,
    },
  },
  categories: { default: { appenders: ["default"], level: "info" } },
});

module.exports = (action, payload, user) => {
  let logUser;
  switch (true) {
    case !!user.account && !!user.name:
      logUser = `${user.name}|${user.account}`;
      break;
    case !!user.account:
      logUser = `${user.account}`;
      break;
    case !!user.name:
      logUser = `${user.name}`;
      break;
  }
  log4js
    .getLogger("default")
    .info(`${action}|${JSON.stringify(payload)}|${logUser}`);
};
