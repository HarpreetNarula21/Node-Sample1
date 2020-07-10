const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const async = require("async");
const crypto = require("crypto");

const User = require("../models/users");

router.post("/signup", (req, res, next) => {
  User.find({ email: req.body.email })
    .exec()
    .then((user) => {
      if (user.length >= 1) {
        return res.status(409).json({
          message: "Email already exists",
        });
      } else {
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            return res.status(500).json({
              error: err,
            });
          } else {
            const user = new User({
              _id: new mongoose.Types.ObjectId(),
              email: req.body.email,
              password: hash,
              phone_number: req.body.phone_number,
            });
            user
              .save()
              .then((result) => {
                console.log(result);
                //req.flash('success_msg', 'You are registered and can now log in');
                res.status(201).json({
                  message: "User created!",
                  result: {
                    _id: result._id,
                    email: result.email,
                    password: result.password,
                    phone_number: result.phone_number,
                  },
                });
              })
              .catch((err) => {
                console.log(err);
                res.status(500).json({
                  error: err,
                });
              });
          }
        });
      }
    });
});

router.post("/login", (req, res, next) => {
  User.find({ email: req.body.email })
    .exec()
    .then((user) => {
      if (user.length < 1) {
        return res.status(404).json({
          message: "Auth failed",
        });
      }
      bcrypt.compare(req.body.password, user[0].password, (err, result) => {
        if (err) {
          return res.status(401).json({
            message: "Auth Failed",
          });
        }
        if (result) {
          const token = jwt.sign(
            {
              email: user[0].email,
              userId: user[0]._id,
            },
            process.env.JWT_KEY,
            {
              expiresIn: "1h",
            }
          );
          return res.status(200).json({
            message: "Auth successful!",
            token: token,
          });
        }
        res.status(401).json({
          message: "Auth Failed",
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        error: err,
      });
    });
});

router.delete("/:userId", (req, res, next) => {
  const id = req.params.userId;
  User.findById({ _id: id })
    .exec()
    .then((user) => {
      if (user.length >= 1) {
        User.remove({ user })
          .exec()
          .then((result) => {
            res.status(200).json({
              message: "User deleted",
            });
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({
              error: err,
            });
          });
      } else {
        res.status(402).json({
          message: "User not found",
        });
      }
    });
});

router.get("/", (req, res, next) => {
  User.find()
    .select("-__v")
    .exec()
    .then((docs) => {
      const response = {
        count: docs.length,
        user: docs.map((doc) => {
          return {
            _id: doc._id,
            email: doc.email,
          };
        }),
      };

      if (docs.length > 0) {
        console.log(docs);
        res.status(200).json(response);
      } else {
        res.status(404).json({ message: "Empty Collection. No entries found" });
      }
    })
    .catch((err) => {
      console.log(err);
      res.json(500).json({
        error: err,
      });
    });
});

router.get("/:userId", (req, res, next) => {
  User.findById(req.params.userId)
    //.populate("product")
    .exec()
    .then((user) => {
      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }
      res.status(200).json({
        user: user,
        request: {
          type: "GET",
          url: "http://localhost:3000/orders",
        },
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
});

//Render forgot password page
router.get("/forgotpassword", (req, res, next) => {
  res.render("forgotpassword");
});

router.post("/forgotpassword", (req, res, next) => {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString("hex");
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          if (!user) {
            console.log("No account with this email id exists");
            req.flash("error", "No account with that email address exists.");
            return res.redirect("/users/forgotpassword");
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
      function (token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          host: "smtp.gmail.com",
          ports: 587,
          secure: false,
          requireTLS: true,
          auth: {
            user: "hnarula02@gmail.com",
            pass: "Sammy@123",
          },
        });
        var mailOptions = {
          to: user.email,
          from: "hnarula02@gmail.com",
          subject: "Node.js Password Reset",
          text:
            "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            "http://" +
            req.headers.host +
            "/reset/" +
            token +
            "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n",
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          console.log("mail sent");
          req.flash(
            "success",
            "An e-mail has been sent to " +
              user.email +
              " with further instructions."
          );
          done(err, "done");
        });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.render("forgotpassword");
    }
  );
});

module.exports = router;
