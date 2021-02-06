const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { ApolloServer } = require("apollo-server-express");

const typeDefs = require("./schema/typeDefs.js");
const resolvers = require("./schema/resolvers.js");

mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true
    });
  } catch (error) {
    console.log("Something went wrong with the database :(");
    return;
  }
  console.log("Yahoooo! Connected to the database.");
};

connectDB();

const app = express();
const port = process.env.PORT;

// Allow cross-origin
const whitelist = [process.env.DOMAIN, "http://localhost:3000"];

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) === -1) {
      var message = `Access denied`;
      return callback(message, false);
    }
    return callback(null, true);
  },
  credentials: true
};

app.use(cookieParser());
app.use(cors(corsOptions));

const context = (req, res) => {
  let user = {};

  let token = req.cookies;

  try {
    let a = jwt.verify(token.coffee, process.env.JWT);
    user["_id"] = a._id;
    user["service"] = a.service;
    user["name"] = a.name;
  } catch (e) {
    return { req, res, user: null };
  }

  return { req, res, user };
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => context(req, req.res),
  introspection: false,
  playground: false
});

server.applyMiddleware({ app, cors: false });
app.listen(port, () => console.log(`Hola! Listening at port ${port}.`));
