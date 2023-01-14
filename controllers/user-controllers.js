const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find().populate("todos");
  } catch (err) {
    const error = new HttpError(
      "Could not find users, please try again later.",
      500
    );
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

exports.getUserProfile = async (req, res, next) => {
  const userId = req.params.id;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Could not find user, please try again later.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("User not found!", 404);
    return next(error);
  }

  res.json({ user });
};

exports.signup = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.find({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("User exist already", 422);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create user", 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    todos: [],
  });

  let user;
  try {
    user = await createdUser.save();
  } catch (err) {
    const error = new HttpError("Could not signup user.", 404);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        name: createdUser.name,
      },
      "tajnistring",
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  res.status(200).json({
    userId: createdUser.id,
    name: createdUser.name,
    token: token,
  });
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Loggin in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      401
    );
    return next(error);
  }

  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in please check credentials.",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "Could not log you in please check credentials.",
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        name: existingUser.name,
      },
      "tajnistring",
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError(
      "Signing in failed, please try again later.",
      500
    );
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    name: existingUser.name,
    token: token,
  });
};
