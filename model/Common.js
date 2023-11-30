const { ObjectId } = require("mongodb");
const DB = require("../libs/db");

exports.list = async (collection, query = {}, sort = {}) => {
  let find = await DB[collection].find(query).sort(sort).toArray();
  return find;
};

exports.queue = async (payload) => {
  await DB.Queue.add(payload);
};

exports.count = async (collection, query = {}) => {
  let length = await DB[collection].count(query);
  return length;
};

exports.find = async (collection, query = {}) => {
  if (query._id && typeof query._id != "object") {
    query._id = ObjectId(query._id);
  }
  let find = await DB[collection].findOne(query);
  return find;
};

exports.insert = async (collection, data) => {
  if (Array.isArray(data)) {
    let bulk = DB[collection].initializeUnorderedBulkOp();
    data.forEach((row) => {
      bulk.insert(row);
    });
    try {
      await bulk.execute();
    } catch (error) {}
  } else {
    await DB[collection].insertOne(data);
  }
};

exports.update = async (collection, query, data, upsert = false) => {
  if (query._id && typeof query._id != "object") {
    query._id = ObjectId(query._id);
    delete data._id;
  }
  return await DB[collection].updateOne(query, { $set: data }, { upsert });
};

exports.upsert = async (collection, query, data) => {
  delete data._id;
  await DB[collection].updateOne(query, { $set: data }, { upsert: true });
};

exports.delete = async (collection, query) => {
  if (query._id && typeof query._id != "object") {
    query._id = ObjectId(query._id);
  }
  await DB[collection].deleteMany(query);
};

exports.reIndex = async (collection) => {
  // await DB[collection].reIndex();
};

exports.remove = async (collection) => {
  await DB[collection].remove();
};
