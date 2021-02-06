const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const companySchema = new Schema(
  {
    Employer_Name: {
      type: String,
      required: true
    },

    banks: {
      required: true,
      type: [
        {
          name: {
            type: String,
            required: true
          },
          category: {
            type: String,
            required: true
          }
        }
      ]
    }
  },

  {
    collection: "Company"
  }
);

module.exports = mongoose.model("Company", companySchema);
