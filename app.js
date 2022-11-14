const express = require("express");
const app = express();
var csrf = require("tiny-csrf");
const { Todo } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Shhhhhh! some secret string is h"));
app.use(csrf("Your_Secret_Key_Must_Be_32_Bits_",["POST","PUT","DELETE"]));
//set EJS as view engine
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));


app.get("/", async (request, response) => {
  const allTodos = await Todo.getTodos();
  const overdue = await Todo.overDue();
  const dueLater = await Todo.dueLater();
  const completedItems = await Todo.completedItems();
  const dueToday = await Todo.dueToday();

  if (request.accepts("html")) {
    response.render("index", {
      allTodos,
      overdue,
      dueLater,
      dueToday,
      completedItems,
      csrfToken: request.csrfToken(),
    });
  } else {
    response.json({
      overdue,
      dueToday,
      dueLater,
      completedItems,
    });
  }
});



app.get("/todos", async function (request, response) {
  console.log("Processing list of all Todos ...");
  // FILL IN YOUR CODE HERE

  // First, we have to query our PostgerSQL database using Sequelize to get list of all Todos.
  // Then, we have to respond with all Todos, like:
  // response.send(todos)
  try {
    const todos = await Todo.findAll({ order: [["id", "ASC"]] });
    return response.send(todos);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/todos/:id", async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    console.log(todo);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/todos", async function (request, response) {
  try {
    //const todo =
    await Todo.addTodo({
      title: request.body.title,
      dueDate: request.body.dueDate,
      completed: false,
    });
    //return response.json(todo);
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id", async function (request, response) {
  console.log("Todo is marked as completed:",request.params.id);
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.setCompletionStatus(request.body.completed);
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id", async function (request, response) {
  console.log("We have to delete a Todo with ID: ", request.params.id);
  // FILL IN YOUR CODE HERE

  // First, we have to query our database to delete a Todo by ID.
  // Then, we have to respond back with true/false based on whether the Todo was deleted or not.
  // response.send(true)
  const todo = await Todo.findByPk(request.params.id);
  try {
    //const deletedTodo =
    await todo.destroy();
    return response.send(true);
  } catch (error) {
    console.log(error);
    return response.send(false);
  }
});

module.exports = app;
