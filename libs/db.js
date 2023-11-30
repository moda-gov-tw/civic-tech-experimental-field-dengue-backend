const { MongoClient } = require("mongodb");
const mongodash = require("mongodash");
const mongoDbQueue = require("./mongodb-promise-queue");
let DB = {};
const url = process.env.MONGODB;

(async () => {
  await mongodash.init({
    mongoClient: new MongoClient(url, {
      useUnifiedTopology: true,
      maxPoolSize: 10,
    }),
    autoConnect: true,
  });
  let client = mongodash.getMongoClient();

  DB.sections = client.db("dengue").collection("sections");
  DB.addresses = client.db("dengue").collection("addresses");
  DB.signs = client.db("dengue").collection("signs");
  DB.Queue = mongoDbQueue(client.db("dengue"), "SMSQueue");
})();
module.exports = DB;
