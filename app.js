require("dotenv").config();

const compression = require("compression");
const express = require("express");
const expressip = require("express-ip");
const bodyParser = require("body-parser");
const cors = require("cors");
const dayjs = require("dayjs");
const _ = require("lodash");
const logger = require("./libs/logger.js");
const helmet = require("helmet");
const routes = require("./routes");
const { getUser } = require("./libs/util");

const app = express();
const port = process.env.PORT;

app.use(function setCommonHeaders(req, res, next) {
  res.set("Access-Control-Allow-Private-Network", "true");
  next();
});
app.use(
  cors({
    origin: process.env.CORSORIGIN,
  })
);

app.use(
  helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
    },
  })
);

app.use(compression({ threshold: 0 }));
app.use(bodyParser.urlencoded({ limit: "500mb", extended: false }));
app.use(bodyParser.json({ limit: "500mb" }));
app.use(expressip().getIpInfoMiddleware);

app.use(getUser);
app.use("/uploads", express.static("uploads"));
app.use("/dashboard/", routes.dashboard);
app.use("/dashboard/file", routes.file);
app.use("/address", routes.address);
app.use("/report", routes.report);
app.use("/section", routes.section);
app.use("/file", routes.file);
app.use("/sign", routes.sign);
app.use((err, req, res, next) => {
  if (err) {
    return res.sendStatus(500);
  }
  next();
});
app.listen(port);
