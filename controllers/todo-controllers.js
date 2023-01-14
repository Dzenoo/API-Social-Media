const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const fs = require("fs");
const HttpError = require("../models/http-error");

const User = require("../models/user");
const Todo = require("../models/todo");

exports.getTodos = async (req, res, next) => {
  let todosEi;
  try {
    todosEi = await Todo.find();
  } catch (err) {
    const error = new HttpError("Fetching todos failed, please try again", 500);
    return next(error);
  }

  res.json({ todosEi });
};

exports.getTodoById = async (req, res, next) => {
  const todoId = req.params.tid;

  let todoById;
  try {
    todoById = await Todo.findById(todoId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a todo.",
      500
    );
    return next(error);
  }

  if (!todoById) {
    const error = new HttpError(
      "Could not find place for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ todoById });
};

exports.getTodoByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let userTodo;
  try {
    userTodo = await User.findById(userId).populate("todos");
  } catch (err) {
    const error = new HttpError("Fetching todo failed, please try again", 500);
    return next(error);
  }

  if (!userTodo || userTodo.todos.length === 0) {
    return next(new HttpError("Could not find todo, for that user", 500));
  }

  res.json({
    todos: userTodo.todos.map((todo) => todo.toObject({ getters: true })),
  });
};

exports.createTodo = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, category } = req.body;

  const createdTodo = new Todo({
    title,
    description,
    image: req.file.path,
    category,
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError("Creating todo failed, please try again.", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "Could not find user for this id, please try again.",
      500
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdTodo.save({ session: sess });
    user.todos.push(createdTodo);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Creating todo failed, please try again.", 500);
    return next(error);
  }

  res.status(200).json({ todo: createdTodo });
};

exports.updateTodo = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, category } = req.body;
  const todoId = req.params.tid;

  let todo;
  try {
    todo = await Todo.findById(todoId);
  } catch (err) {
    const error = new HttpError("Could not update, please try again.", 500);
    return next(error);
  }

  todo.title = title;
  todo.description = description;
  todo.category = category;

  try {
    await todo.save();
  } catch (err) {
    const error = new HttpError("Could not update, please try again.", 500);
    return next(error);
  }

  res.status(200).json({ todo: todo.toObject({ getters: true }) });
};

exports.deleteTodo = async (req, res, next) => {
  const todoId = req.params.tid;

  let todo;
  try {
    todo = await Todo.findById(todoId).populate("creator");
  } catch (err) {
    const error = new HttpError("Could not delete, please try again.", 500);
    return next(error);
  }

  if (!todo) {
    const error = new HttpError("Could not find todo for this id.", 404);
    return next(error);
  }

  if (todo.creator.id !== req.userData.userId) {
    const error = new HttpError("You are not allowed to delete this todo");
    return next(error);
  }

  const imagePath = todo.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await todo.remove({ session: sess });
    todo.creator.todos.pull(todo);
    await todo.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Could not delete todo, please try again.",
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.json({ message: "Todo deleted..." });
};
