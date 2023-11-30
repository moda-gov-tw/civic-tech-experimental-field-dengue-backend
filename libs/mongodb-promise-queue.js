/**
 *
 * mongodb-promise-queue.js - Use your existing MongoDB as a local queue with promise.
 *
 * Copyright (c) 2014 Andrew Chilton
 * Copyright (c) 2018 Frédéric Mascaro
 *
 * License: MIT
 *
 **/

let crypto = require("crypto");

// ========================================================================================

// some helper functions
function id() {
  return crypto.randomBytes(16).toString("hex");
}

// ----------------------------------------------------------------------

function now() {
  return new Date().toISOString();
}

// ----------------------------------------------------------------------

function nowPlusSecs(secs) {
  return new Date(Date.now() + secs * 1000).toISOString();
}

// ----------------------------------------------------------------------

module.exports = function (mongoDbClient, name, opts = {}) {
  return new Queue(mongoDbClient, name, opts);
};

// ========================================================================================

// the Queue object itself
function Queue(mongoDbClient, name, opts = {}) {
  if (!mongoDbClient) {
    throw new Error("mongodb-queue: provide a mongodb.MongoClient");
  }
  if (!name) {
    throw new Error("mongodb-queue: provide a queue name");
  }
  opts = opts || {};

  this.name = name;
  this.col = mongoDbClient.collection(name);
  this.visibility = opts.visibility || 30;
  this.delay = opts.delay || 0;

  if (opts.deadQueue) {
    this.deadQueue = opts.deadQueue;
    this.maxRetries = opts.maxRetries || 5;
  }
}

// ----------------------------------------------------------------------

Queue.prototype.createIndexes = function () {
  return this.col.createIndex({ deleted: 1, visible: 1 }).then((indexname) => {
    return this.col
      .createIndex({ ack: 1 }, { unique: true, sparse: true })
      .then(() => indexname);
  });
};

// ----------------------------------------------------------------------

Queue.prototype.add = function (payload, opts = {}) {
  let delay = opts.delay || this.delay;
  let visible = delay ? nowPlusSecs(delay) : now();

  let messages = [];

  if (payload instanceof Array) {
    if (payload.length === 0) {
      let errMsg = "Queue.add(): Array payload length must be greater than 0";
      // return callback(new Error(errMsg))
      throw new Error(errMsg);
    }

    payload.forEach(function (payload) {
      messages.push({
        visible: visible,
        payload: payload,
      });
    });
  } else {
    messages.push({
      visible: visible,
      payload: payload,
    });
  }

  return this.col.insertMany(messages).then((results) => {
    return payload instanceof Array
      ? results.insertedIds
      : results.insertedIds[0];
  });
};

// ----------------------------------------------------------------------

Queue.prototype.get = function (opts = {}) {
  let visibility = opts.visibility || this.visibility;

  let query = {
    deleted: null,
    visible: { $lte: now() },
  };

  let sort = {
    _id: 1,
  };

  let update = {
    $inc: { tries: 1 },
    $set: {
      ack: id(),
      visible: nowPlusSecs(visibility),
    },
  };

  return this.col
    .findOneAndUpdate(query, update, { sort: sort, returnDocument: "after" })
    .then((result) => {
      let msg = result.value;

      if (!msg) return;

      // convert to an external representation
      msg = {
        // convert '_id' to an 'id' string
        id: "" + msg._id,
        ack: msg.ack,
        payload: msg.payload,
        tries: msg.tries,
      };

      // if we have a deadQueue, then check the tries, else don't
      if (this.deadQueue) {
        // check the tries
        if (msg.tries > this.maxRetries) {
          // So:
          // 1) add this message to the deadQueue
          // 2) ack this message from the regular queue
          // 3) call ourself to return a new message (if exists)
          return this.deadQueue
            .add(msg)
            .then(() => {
              this.ack(msg.ack);
            })
            .then(() => {
              this.get(opts);
            });
        }
      }

      return msg;
    });
};

// ----------------------------------------------------------------------

Queue.prototype.ping = function (ack, opts = {}) {
  let visibility = opts.visibility || this.visibility;

  let query = {
    ack: ack,
    visible: { $gt: now() },
    deleted: null,
  };

  let update = {
    $set: {
      visible: nowPlusSecs(visibility),
    },
  };

  return this.col
    .findOneAndUpdate(query, update, { returnOriginal: false })
    .then((msg) => {
      if (!msg.value) {
        throw new Error("Queue.ping(): Unidentified ack  : " + ack);
      }

      return "" + msg.value._id;
    });
};

// ----------------------------------------------------------------------

Queue.prototype.ack = function (ack) {
  let query = {
    ack: ack,
    visible: { $gt: now() },
    deleted: null,
  };

  let update = {
    $set: {
      deleted: now(),
    },
  };

  return this.col
    .findOneAndUpdate(query, update, { returnOriginal: false })
    .then((msg) => {
      if (!msg.value) {
        throw new Error("Queue.ack(): Unidentified ack : " + ack);
      }

      return "" + msg.value._id;
    });
};

// ----------------------------------------------------------------------

Queue.prototype.clean = function () {
  let query = {
    deleted: { $exists: true },
  };

  return this.col.deleteMany(query);
};

// ----------------------------------------------------------------------

Queue.prototype.total = function () {
  return this.col.count();
};

// ----------------------------------------------------------------------

Queue.prototype.size = function () {
  let query = {
    deleted: null,
    visible: { $lte: now() },
  };

  return this.col.count(query);
};

// ----------------------------------------------------------------------

Queue.prototype.inFlight = function () {
  let query = {
    ack: { $exists: true },
    visible: { $gt: now() },
    deleted: null,
  };

  return this.col.count(query);
};

// ----------------------------------------------------------------------

Queue.prototype.done = function () {
  let query = {
    deleted: { $exists: true },
  };

  return this.col.count(query);
};
