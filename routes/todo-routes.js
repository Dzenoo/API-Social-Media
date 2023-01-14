const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middlewares/auth");
const fileUpload = require("../middlewares/file-upload");

const todoContollers = require("../controllers/todo-controllers");

const router = express.Router();

router.get("/", todoContollers.getTodos);

router.get("/:tid", todoContollers.getTodoById);

router.get("/user/:uid", todoContollers.getTodoByUserId);

router.post(
  "/new",
  checkAuth,
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").not().isEmpty(),
    check("category").not().isEmpty(),
  ],
  todoContollers.createTodo
);

router.patch("/:tid", checkAuth, todoContollers.updateTodo);

router.delete("/:tid", checkAuth, todoContollers.deleteTodo);

module.exports = router;
