const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    number: {
      type: String,
      required: true
    },
    
    name: {
      type: String,
      required: true
    },

    password: {
      type: String,
      required: true
    },
    
    email: {
      type: String,
      required: true
    },
    
    service: {
      type: String,
      required: true
    }
  },

  {
    collection: "User"
  }
);

userSchema.index({ number: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
