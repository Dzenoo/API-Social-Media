const express = require("express");
const { check } = require("express-validator");

const userContollers = require("../controllers/user-controllers");
const fileUpload = require("../middlewares/file-upload");

const router = express.Router();

router.get("/", userContollers.getUsers);

router.get("/:id", userContollers.getUserProfile);

router.post(
  "/signup",
  fileUpload.single("image"),

  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").not().isEmpty(),
  ],
  userContollers.signup
);

router.post("/login", userContollers.login);

module.exports = router;
