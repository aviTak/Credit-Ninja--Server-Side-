const { gql, AuthenticationError } = require("apollo-server-express");
const mongoose = require("mongoose");
const Company = require("../models/company.js");
const User = require("../models/user.js");
const Request = require("../models/request.js");
const Bcrypt = require("bcryptjs");
const request = require("request");
const jwt = require("jsonwebtoken");

const ObjectId = id => {
  return new mongoose.Types.ObjectId(id);
};

const otpApi = process.env.OTP_API;

const resolvers = {
  Query: {
    user(_, args, context) {
      if (!context.user) {
        return null;
      } else {
        let { _id, service, name } = context.user;
        return { _id, service, name };
      }
    },

    company: (_, { id }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      try {
        ObjectId(id);
      } catch (e) {
        return null;
      }
      return Company.findById(id);
    },

    companies: async (_, { search }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");

      if (!search) return null;

      var result = await Company.aggregate([
        {
          $search: {
            autocomplete: {
              path: "Employer_Name",
              query: search,
              fuzzy: {
                maxEdits: 2,
                prefixLength: 1,
                maxExpansions: 256
              }
            }
          }
        },
        {
          $limit: 10
        }
      ]);

      return result;
    }
  },

  Mutation: {
    sendOtp: async (_, { number }, context) => {
      let value = false,
        message = null;

      let options = {
        method: "GET",
        url: `http://2factor.in/API/V1/${otpApi}/SMS/${number}/AUTOGEN`,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        form: {}
      };

      await new Promise((resolve, reject) => {
        request(options, function(error, response, body) {
          if (error) message = "Network issue";
          else {
            body = JSON.parse(body);
            if (body.Status === "Success") value = true;
            message = body.Details;
          }
          resolve();
        });
      });

      if (!value) return { value, message };

      await Request.findOneAndUpdate(
        { number }, // Query parameter
        {
          // Replacement document
          session: message,
          createdAt: new Date()
        },
        { upsert: true, runValidators: true, context: "query" }
      );

      return { value, message };
    },

    verify: async (_, { session, otp, password, name }, context) => {
      if (password.length < 8)
        throw new Error("Password should have more than 8 characters");

      if (!name) throw new Error("Name is mandatory");

      let user = {},
        work = true;

      let options = {
        method: "GET",
        url: `http://2factor.in/API/V1/${otpApi}/SMS/VERIFY/${session}/${otp}`,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        form: {}
      };

      await new Promise((resolve, reject) => {
        request(options, function(error, response, body) {
          body = JSON.parse(body);
          if (error) work = false;
          else if (body.Status !== "Success") work = false;
          else if (body.Details === "OTP Expired") work = false;

          resolve();
        });
      });

      if (!work) return null;

      let a = await Request.findOne({ session });
      if (!a) return null;

      let no = a.number;
      let b = await User.findOne({ number: no });

      if (b) {
        user["_id"] = b._id;
        user["service"] = b.service;
        user["name"] = b.name;

        await User.updateOne(
          { number: no },
          { $set: { password: Bcrypt.hashSync(password, 10), name: name } },
          { upsert: false, runValidators: true, context: "query" }
        );
      } else {
        let c = await User.create({
          number: no,
          password: Bcrypt.hashSync(password, 10),
          service: "free",
          name: name
        });

        user["_id"] = c._id;
        user["service"] = c.service; // free
        user["name"] = name
      }

      // Remove OTP request

      try {
        await Request.deleteOne({ session });
      } catch (e) {}

      var token;

      token = jwt.sign(
        { _id: user._id, service: user.service, name: name },
        process.env.JWT,
        {
          algorithm: "HS256",
          expiresIn: "12h"
        }
      );

      context.res.cookie("coffee", token, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 1 * 12 * 60 * 60 * 1000
      });

      return { _id: user._id, service: user.service, name: name };
    },

    login: async (_, { number, password }, context) => {
      let user = {};
      let a = await User.findOne({ number });

      if (!a) return null;

      user["_id"] = a._id;
      user["service"] = a.service;
      user["name"] = a.name;

      var token;

      if (Bcrypt.compareSync(password, a.password)) {
        token = jwt.sign(
          { _id: user._id, service: user.service, name: user.name },
          process.env.JWT,
          {
            algorithm: "HS256",
            expiresIn: "12h"
          }
        );

        context.res.cookie("coffee", token, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge: 1 * 12 * 60 * 60 * 1000
        });

        return { _id: user._id, service: user.service, name: user.name };
      }
      return null;
    },

    logout: (_, args, context) => {
      context.res.cookie("coffee", 0, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 0
      });

      return { value: true };
    }
  }
};

module.exports = resolvers;
