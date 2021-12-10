//importing
import express from "express";
import Mongoose from "mongoose";
import Pusher from "pusher";
import Messages from "./dbMessages.js";
import cors from "cors";
import bcrypt from "bcrypt";
import Joi from "joi";
import users from "./Users.js";
import jwt from "jsonwebtoken";
import Users from "./Users.js";

//app config
const app = express();
const port = process.env.PORT || 5000;
const pusher = new Pusher({
  appId: "1313330",
  key: "7b837337ccb8aebc6007",
  secret: "ba5feab47629986b0e11",
  cluster: "ap2",
  useTLS: true,
});

const db = Mongoose.connection;
db.once("open", () => {
  console.log("db connected");

  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch();
  changeStream.on("change", (change) => {
    console.log("a change occured", change);

    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("mern-msg", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        recieved: messageDetails.recieved,
      });
    } else {
      console.log("error triggering pusher");
    }
  });
});
//middleware
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

//db config
const mongoURI =
  "mongodb+srv://admin:admin@cluster0.gaoar.mongodb.net/msg?retryWrites=true&w=majority";
Mongoose.connect(mongoURI, {
  // useCreateIndex: true,
  useNewUrlParser: true,
  useunifiedTopology: true,
});

// ?????

//api routes
app.get("/", (req, res) => res.status(200).send("hello world"));

app.get("/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.delete("/messages/delete", (req, res) => {
  Messages.remove((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send("data");
    }
  });
});

// app.get("/messages/name", (req, res) => {
//   Messages.findOne((err, data) => {
//     if (err) {
//       res.status(500).send(err);
//     } else {
//       res.status(200).send(data);
//     }
//   });
// });

const postUser = async (req, res, next) => {
  //joi schema
  console.log(req.body);
  const Schema = Joi.object({
    name: Joi.string(),
    phone: Joi.string(),
    email: Joi.string(),
    password: Joi.string(),
    //phone: Joi.string().pattern(/^[0-9]+$/).required()
  });
  //joi validation
  var { error } = await Schema.validate(req.body);
  if (error) return res.status(400).send({ msg: error.details[0].message });

  //email already exists check
  var existUser = await users.findOne({ email: req.body.email }).exec();
  if (existUser) return res.status(400).send({ msg: "email already exists" });

  //post to mongodb using mongoose

  const salt = await bcrypt.genSalt(10);
  req.body.password = await bcrypt.hash(req.body.password, salt);

  const user = new users({
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email,
    password: req.body.password,
  });
  try {
    const response = await user.save();
    res.send(response);
  } catch (err) {
    res.status(400).send(err);
  }
};

const loginUser = async (req, res, next) => {
  //user input validation - joi validation
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  var { error } = await schema.validate(req.body);
  if (error) return res.status(400).send({ msg: error.details[0].message });

  //was user registered
  var existUser = await users.findOne({ email: req.body.email }).exec();
  if (!existUser) return res.status(400).send({ msg: "email not registered" });

  //password comparison check
  const isValid = await bcrypt.compare(req.body.password, existUser.password);
  if (!isValid) return res.status(400).send({ msg: "password doesnt matches" });

  //Generate Token
  var token = jwt.sign({ existUser }, "SWERA", { expiresIn: "1hr" });
  res.send(token);
};

const getUsers = (req, res) => {
  Users.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
};

const newMessage = (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
};

//routes
app.post("/messages/new", newMessage);
app.get("/users/userlist", getUsers);
app.post("/users/saveuser", postUser);
app.post("/users/login", loginUser);

//listen
app.listen(port, () => console.log(`Listening on localhost:${port}`));
