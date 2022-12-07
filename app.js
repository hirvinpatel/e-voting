const express = require("express");
const flash = require("connect-flash");
const app = express();
var csrf = require("tiny-csrf");
const { Todo, User } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");

const saltRounds = 10;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Shhhhhh! some secret string is h"));
app.use(csrf("Your_Secret_Key_Must_Be_32_Bits_", ["POST", "PUT", "DELETE"]));
//set EJS as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "my-sper-secret-key-12313234243434",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Please Check e-mail Id" });
          //return done(error)
        });
    }
    
    )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});
//flash message coding
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

app.get("/", async (request, response) => {
  if (request.session.passport) {
    res.redirect("/todos");
  }
  else{
  response.render("index", {
    title: "Todo Application",
    csrfToken: request.csrfToken(),
  });
}
});
app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),async (request, response) => {
    // console.log(request.user);
    const loggedInUser = request.user.id;
    const allTodos = await Todo.getTodos();
    const overdue = await Todo.overDue(loggedInUser);
    const dueLater = await Todo.dueLater(loggedInUser);
    const completedItems = await Todo.completedItems(loggedInUser);
    const dueToday = await Todo.dueToday(loggedInUser);

    if (request.accepts("html")) {
      response.render("todos", {
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
  }
);
app.get("/signup", (request, response) =>{
  response.render("signup", {
    title: "signup",
    csrfToken: request.csrfToken(),
  });
});

/*app.get("/todos", async function (request, response) {
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
*/
app.get("/login", (request, response) => {
  response.render("login", { title: "login", csrfToken: request.csrfToken() });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    console.log(request.user);
    response.redirect("/todos");
  }
);
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    } else response.redirect("/");
  });
});
app.post("/users", async function (request, response) {
  console.log(request.body);
  if(request.body.firstName.length<1 )
  {
    request.flash("error", "please enter First Name");
     return response.redirect('/signup');
  }
  if(request.body.lastName.length<1 )
  {
    request.flash("error", "please enter Last Name");
     return response.redirect('/signup');
  }
  if(request.body.email.length<1)
  {
    request.flash('error', 'please enter Email Id');
    return response.redirect('/signup');
  }
  if(request.body.password.length<8)
  {
    request.flash("error", "please enter password consist of minimum 8 characters");
     return response.redirect('/signup');
  }
  // hash password using bcrypt
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        console.redirect("/");
      }
      return response.redirect("/todos");
    });
  } catch (error) {
    console.log(error);
    request.flash("error", error.message);
    return response.status(422).json(error);
    //return response.redirect("/signup");
  }
});

app.post("/todos",connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log(request.user);
    if(request.body.title== null || request.body.title.length<5)
    {
      request.flash('error', 'please enter a todo title with minimum 5 characters');
      return response.redirect('/todos');
    }
    if(!request.body.dueDate){
      request.flash('error', 'please select date');
      return response.redirect('/todos');
    }
    try {
      //const todo =
      await Todo.addTodo({
        title: request.body.title,
        dueDate: request.body.dueDate,
        userId: request.user.id,
        completed: false,
      });
      //return response.json(todo);
      return response.redirect("/todos");
    } catch (error) {
      console.log(error);
      request.flash("error", error.message);
      return response.status(422).json(error);
    }
  }
);

app.put(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("Todo is marked as completed:", request.params.id);
    const todo = await Todo.findByPk(request.params.id);
    try {
      const updatedTodo = await todo.setCompletionStatus(request.body.completed);
      return response.json(updatedTodo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete("/todos/:id",connectEnsureLogin.ensureLoggedIn(),async function (request, response) {
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
  }
);

module.exports = app;
