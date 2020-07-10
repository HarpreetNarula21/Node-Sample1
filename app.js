const express = require("express");
const app = express();
const mongoose = require("mongoose");
require("dotenv/config");
const userRoutes = require("./routes/users");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const flash = require("connect-flash");
const session = require("express-session");
const categoriesRoutes = require("./routes/categories");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(flash());
app.use(
  session({
    secret: "secret123",
    saveUninitialized: true,
    resave: true,
  })
);

//Flash messages trial

app.get("/", (req, res) => {
  req.flash("error", "This is a error message");
  res.redirect("/contact");
});

app.get("/contact", (req, res) => {
  res.send(req.flash("error"));
});

// app.use(function (req, res, next) {
//   res.locals.currentUser = req.user;
//   res.locals.success = req.flash("success");
//   res.locals.error = req.flash("error");
//   next();
// });

//EJS
app.use(expressLayouts);
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));

//Connect to DB
mongoose
  .connect(process.env.DB_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB Connected!"))
  .catch((err) => {
    console.log("Connection Error: ", err.message);
  });

mongoose.Promise = global.Promise;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, PATCH");
    return res.status(200).json({});
  }
  next();
});

//EJS Welcome render file
app.get("/users", (req, res) => res.render("welcome"));
app.get("/users/login", (req, res) => res.render("login"));
app.get("/users/signup", (req, res) => res.render("signup"));
app.get("/users/forgotpassword", (req, res) => res.render("forgotpassword"));

app.use("/users", userRoutes);
app.use("/categories", categoriesRoutes);

module.exports = app;
