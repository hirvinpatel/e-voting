const express = require("express");
const flash = require("connect-flash");
const app = express();
var csrf = require("tiny-csrf");
const { Admin,Voter,Election,Question,Option } = require("./models");
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
  "admin-local",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { email: username } })
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

passport.use(
  "voter-local",
  new LocalStrategy(
    {
      usernameField: "voterId",
      passwordField: "password",
    },
    (request,username, password, done) => {
      Voter.findOne({ where: { voterId: username,electionId:request.params.id } })
        .then(async (voter) => {
          const result = await bcrypt.compare(password, voter.password);
          if (result) {
            return done(null, voter);
          } else {
            return done(null, false, { message: "Incorrect password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Please Check Voter Id" });
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
  Admin.findByPk(id)
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
  if (request.user) {
    return response.redirect("/election");
  }
  else{
  response.render("index", {
    title: "Online Voting Application",
   // csrfToken: request.csrfToken(),
  });
}
});
app.get(
  "/createelection",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("newelection", {
      title: "Create new election",
      csrfToken: request.csrfToken(),
    });
  }
);
app.get("/election",
  connectEnsureLogin.ensureLoggedIn(),async (request, response) => {
    // console.log(request.user);
      const userName = request.user.firstName;
      const electionlist = await Election.getAllElection(request.user.id);
      console.log("electionlist");
      try {
    if (request.accepts("html")) {
      response.render("election", {
        electionlist,
        userName,
        csrfToken: request.csrfToken(),
        title:"Online Voting Platform ",
        
      });
    } else {
      response.json({
        electionlist,
      });
    }
  }catch(error){
    console.log(error);
    return response.status(422).json(error);
  }
}
);

app.get( "/index",  connectEnsureLogin.ensureLoggedIn(),  async (request, response) => {
    response.render("index", { csrfToken: request.csrfToken() });
  }
);
app.get("/signup", (request, response) =>{
  try{
  response.render("signup", {
    title: "Signup as Admin",
    csrfToken: request.csrfToken(),
  });
}catch(err)
{
  console.log(err);
}
});


app.get("/login", (request, response) => {
  if (request.user) {
    return response.redirect("/election");
  }
  response.render("login", 
  { title: "login to admin account",
   csrfToken: request.csrfToken(),
   });
});

app.post(
  "/session",
  passport.authenticate("admin-local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    console.log(request.user);
    response.redirect("/election");
  }
);
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    } else response.redirect("/");
  });
});
app.get("/electionlist/:id",connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const voter = await Voter.getAllVoter(request.params.id);
      const voter_count = await Voter.countVoter(request.params.id);
      const question = await Question.getAllQuestion(request.params.id);
      const question_count = await Question.countQuestion(request.params.id);
      const election= await Election.findByPk(request.params.id);
      const electionName = await Election.getAllElection(request.params.id,request.user.id);
      console.log(electionName);
     
      response.render("manageelection", {
        election: election,
        urlName: election.urlName,
        title: electionName.electionName,
        countQuestion: question_count,
        countVoter: voter_count,
        voter: voter,
        question: question,
        id: request.params.id,
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);
app.get(
  "/question/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("newquestion", {
      title: "Create new Question",
      id: request.params.id,
      csrfToken: request.csrfToken(),
    });
  }
);
app.post("/admin", async function (request, response) {
/*  console.log(request.body);
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
  */
  // hash password using bcrypt
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  try {
    const user = await Admin.create({
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
      else
         response.redirect("/election");
    });
  } catch (error) {
   // console.log(error);
   // request.flash("error", error.message);
    //return response.status(422).json(error);
   return response.redirect("/signup");
  }
});

app.post("/election",connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    /*console.log(request.user);
    if(request.body.title== null || request.body.title.length<5)
    {
      request.flash('error', 'please enter a todo title with minimum 5 characters');
      return response.redirect('/todos');
    }
    if(!request.body.dueDate){
      request.flash('error', 'please select date');
      return response.redirect('/todos');
    }
    */
    try {
      //const todo =
      await Election.addElection({
        electionName: request.body.electionName,
        adminId: request.user.id,
        urlName:request.body.urlName,
      
      });
      //return response.json(todo);
      response.redirect("/election");
    } catch (error) {
      console.log(error);
      request.flash("error", error.message);
      return response.status(422).json(error);
    }
  }
);

/*app.put(
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
*/
module.exports = app;
