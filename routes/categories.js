const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Category = require("../models/categories");
const checkAuth = require("../middleware/check-auth");

function slugify(string) {
  const a =
    "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;";
  const b =
    "aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------";
  const p = new RegExp(a.split("").join("|"), "g");

  return string
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w\-]+/g, "") // Remove all non-word characters
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

const buildAncestors = async (id, parent_id) => {
  let ancest = [];
  try {
    let parent_category = await Category.findOne(
      { _id: parent_id },
      { name: 1, slug: 1, ancestors: 1 }
    ).exec();
    if (parent_category) {
      const { _id, name, slug } = parent_category;
      const ancest = [...parent_category.ancestors];
      ancest.unshift({ _id, name, slug });
      Category.findByIdAndUpdate(id, {
        $set: { ancestors: ancest },
      })
        .exec()
        .then((result) => {
          console.log(result);
        });
    }
  } catch (err) {
    console.log(err.message);
  }
};

router.get("/", checkAuth, (req, res, next) => {
  Category.find()
    .select("-__v")
    .exec()
    .then((docs) => {
      const response = {
        count: docs.length,
        categories: docs.map((doc) => {
          return {
            _id: doc._id,
            name: doc.name,
            parent: doc.parent,
            ancestors: doc.ancestors,
            request: {
              type: "GET",
              url: "http://localhost:3000/products/" + doc._id,
            },
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
  console.log("Getting categories");
});

//Posting categories

router.post("/", checkAuth, async (req, res, next) => {
  let parent = req.body.parent ? req.body.parent : null;
  const category = new Category({
    _id: new mongoose.Types.ObjectId(),
    name: req.body.name,
    parent,
  });
  try {
    let newCategory = await category.save();
    buildAncestors(newCategory._id, parent);
    res.status(201).json({
      message: "Category Created",
      createdCategory: {
        id: newCategory._id,
        name: newCategory.name,
        parent: newCategory.parent,
        ancestors: newCategory.ancestors,
        request: {
          type: "GET",
          url: "http://localhost:3000/products/" + newCategory._id,
        },
      },
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

//Display ancestors

router.get("/ancestors/:slug", checkAuth, async (req, res, next) => {
  const slugname = req.params.slug;
  try {
    const result = await Category.find({ slug: slugname })
      .select({
        _id: false,
        name: true,
        "ancestors.slug": true,
        "ancestors.name": true,
      })
      .exec();
    res.status(201).send({ status: "success", result: result });
  } catch (err) {
    res.status(500).send(err);
  }
});

//Displaying descendants

router.get("/descendants/:category_id", checkAuth, async (req, res, next) => {
  try {
    const result = await Category.find({
      "ancestors._id": req.params.category_id,
    })
      .select({ _id: false, name: true })
      .exec();
    res.status(201).send({ status: "success", result: result });
  } catch (err) {
    res.status(500).send(err);
  }
});

//Update Category Name

router.patch("/:category_id", checkAuth, async (req, res, next) => {
  try {
    const id = req.params.category_id;
    const category_name = req.body.name;
    await Category.findByIdAndUpdate(
      { _id: id },
      { $set: { name: category_name, slug: slugify(category_name) } }
    )
      .exec()
      .then((result) => {
        res.status(200).json({
          message: "Category name updated",
          id: result._id,
          request: {
            type: "GET",
            url: "http:/localhost:3000/category/" + id,
          },
        });
      });
  } catch (err) {
    console.log(`Error in updating: ${err}`);
    res.status(500).json({ error: err });
  }
});

//get single category by category id

router.get("/:category_id", checkAuth, async (req, res, next) => {
  try {
    const id = req.params.category_id;
    await Category.findById({ _id: id })
      .select("-__v")
      .exec()
      .then((doc) => {
        console.log("From Database:", doc);
        if (doc) {
          res.status(200).json({
            id: doc._id,
            name: doc.name,
            parent: doc.parent,
            ancestors: doc.ancestors,
            request: {
              type: "GET",
              url: "http://localhost:3000/categories/",
            },
          });
        }
      });
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;
