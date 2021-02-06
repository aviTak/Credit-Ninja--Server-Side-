const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const requestSchema = new Schema(
  {
    number: {
      type: String,
      required: true
    },
    session: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      required: true
    }
  },

  {
    collection: "Request"
  }
);

requestSchema.index({ number: 1 }, { unique: true });

requestSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 1800 // Half an hour
  }
);

module.exports = mongoose.model("Request", requestSchema);
