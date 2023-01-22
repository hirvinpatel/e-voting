const express = require("express");
const flash = require("connect-flash");
const app = express();
const csrf = require("tiny-csrf");
const {
  Admin,
  Voter,
  Election,
  Question,
  Option,
  Answer,
} = require("./models");
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
    (username, password, done) => {
      Voter.findOne({ where: { voterId: username } })
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
  done(null, { id: user.id, role: user.role });
});

passport.deserializeUser((id, done) => {
  if (id.role === "admin") {
    Admin.findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  } else if (id.role === "voter") {
    Voter.findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  }
});

//flash messag
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

app.get("/", async (request, response) => {
  if (request.user) {
    if (request.user.role === "admin") {
      return response.redirect("/election");
    } else if (request.user.role === "voter") {
      request.logout((err) => {
        if (err) {
          return response.json(err);
        }
        response.redirect("/");
      });
    }
  } else {
    response.render("index", {
      title: "E-Voting",
      // csrfToken: request.csrfToken(),
    });
  }
});
app.get(
  "/createelection",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      response.render("newelection", {
        title: "Create new election",
        csrfToken: request.csrfToken(),
      });
    }
    if (request.user.role === "voter") {
      return response.redirect("/");
    }
  }
);

app.get(
  "/createquestion",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("newquestion", {
      title: "Create new question",
      csrfToken: request.csrfToken(),
    });
  }
);
app.get(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      let user = await Admin.findByPk(request.user.id);
      try {
        const userName = request.user.firstName;
        const electionlist = await Election.getAllElection(request.user.id);
        console.log("electionlist");
        if (request.accepts("html")) {
          response.render("election", {
            electionlist,
            title: "Online Voting Platform ",
            userName,
            csrfToken: request.csrfToken(),
          });
        } else {
          response.json({
            electionlist,
          });
        }
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.role === "voter") {
      return response.redirect("/");
    }
  }
);
app.get(
  "/question/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const questionlist = await Question.getAllQuestion(request.params.id);
      console.log(questionlist);
      const election = await Election.findByPk(request.params.id);

      if (request.accepts("html")) {
        response.render("question", {
          question: questionlist,
          election: election,
          title: election.electionName,
          id: request.params.id,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({ questionlist });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);
app.get(
  "/index",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("index", { csrfToken: request.csrfToken() });
  }
);
app.get("/signup", (request, response) => {
  try {
    response.render("signup", {
      title: "Signup as Admin",
      csrfToken: request.csrfToken(),
    });
  } catch (err) {
    console.log(err);
  }
});
app.get("/login", (request, response) => {
  if (request.user) {
    return response.redirect("/election");
  }
  response.render("login", {
    title: "login to admin account",
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
app.get(
  "/electionlist/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      try {
        const voter = await Voter.getAllVoter(request.params.id);
        const voter_count = await Voter.countVoter(request.params.id);
        const question = await Question.getAllQuestion(request.params.id);
        console.log("question=", question);
        const question_count = await Question.countQuestion(request.params.id);
        console.log("No of questions=", question_count);
        const election = await Election.findByPk(request.params.id);
        const electionName = await Election.getAllElection(
          request.params.id,
          request.user.id
        );
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
  }
);

app.get(
  "/question/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      const electionlist = await Election.getAllElection(
        request.params.id,
        request.user.id
      );
      const questionlist = await Question.getAllQuestion(request.params.id);
      const election = await Election.findByPk(request.params.id);
      if (election.launched) {
        request.flash(
          "error",
          "You can't update question becoz election is in running mode"
        );
        return response.redirect(`/electionlist/${request.params.id}`);
      }
      if (request.accepts("html")) {
        response.render("question", {
          title: election.electionName,
          id: request.params.id,
          question: questionlist,
          election: election,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({
          questionlist,
        });
      }
    }
  }
);
app.get(
  "/createquestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      response.render("newquestion", {
        id: request.params.id,
        csrfToken: request.csrfToken(),
      });
    }
  }
);
app.post(
  "/createquestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      if (request.body.questionName.length == 0) {
        request.flash("error", "Please enter the question.");
        return response.redirect(`/createquestion/${request.params.id}`);
      }
      try {
        const question = await Question.addQuestion({
          electionId: request.params.id,
          questionName: request.body.questionName,
          description: request.body.description,
        });
        return response.redirect(
          `/show/question/${request.params.id}/${question.id}/options`
        );
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.post("/admin", async function (request, response) {
  console.log(request.body);
  if (request.body.firstName.length < 1) {
    request.flash("error", "please enter First Name");
    return response.redirect("/signup");
  }
  if (request.body.lastName.length < 1) {
    request.flash("error", "please enter Last Name");
    return response.redirect("/signup");
  }
  if (request.body.email.length < 1) {
    request.flash("error", "please enter Email Id");
    return response.redirect("/signup");
  }
  if (request.body.password.length < 8) {
    request.flash(
      "error",
      "please enter password consist of minimum 8 characters"
    );
    return response.redirect("/signup");
  }
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
      } else response.redirect("/election");
    });
  } catch (error) {
    return response.redirect("/signup");
  }
});

app.post(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log(request.user);
    if (request.user.role === "admin") {
      if (
        request.body.electionName == null ||
        request.body.electionName.length < 3
      ) {
        request.flash(
          "error",
          "please enter a election name with minimum 3 characters"
        );
        return response.redirect("/createelection");
      }
      if (!request.body.urlName) {
        request.flash("error", "please enter election URL");
        return response.redirect("/createelection");
      }

      try {
        await Election.addElection({
          electionName: request.body.electionName,
          adminId: request.user.id,
          urlName: request.body.urlName,
        });
        response.redirect("/election");
      } catch (error) {
        response.redirect("/createelection");
        //console.log(error);
        // request.flash("error", error.message);
        // return response.status(422).json(error);
      }
    } else if (request.user.role === "voter") {
      return response.redirect("/");
    }
  }
);

app.get(
  "/show/question/:id/:questionId/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      try {
        const question = await Question.getQuestion(request.params.questionId);
        const option = await Option.getAllOption(request.params.questionId);
        console.log("no of option=", option.length);
        if (request.accepts("html")) {
          response.render("questiondisplay", {
            id: request.params.id,
            questionId: request.params.questionId,
            title: question.questionName,
            description: question.description,
            option,
            csrfToken: request.csrfToken(),
          });
        } else {
          return response.json({
            option,
          });
        }
      } catch (err) {
        return response.status(422).json(err);
      }
    }
  }
);

app.post(
  "/show/question/:id/:questionId/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      if (!request.body.optionName) {
        request.flash("error", "please enter option");
        return response.redirect(
          `/show/question/${request.params.id}/${request.params.questionId}/options`
        );
      }
      try {
        await Option.addOption({
          optionName: request.body.optionName,
          questionId: request.params.questionId,
        });
        return response.redirect(
          `/show/question/${request.params.id}/${request.params.questionId}/options/`
        );
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);
app.get(
  "/election/:electionId/question/:questionId/options/:optionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      const adminId = request.user.id;
      const admin = await Admin.findByPk(adminId);
      const Question = await Question.findByPk(request.params.questionId);
      const option = await Option.findByPk(request.params.optionId);
      const election = await Election.findByPk(request.params.electionId);
      response.render("updateoption", {
        userName: admin.name,
        election: election,
        question: Question,
        option: option,
        csrfToken: request.csrfToken(),
      });
    }
  }
);
app.post(
  "/election/:electionId/question/:questionId/options/:optionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log(request.body);
    if (request.user.role === "admin") {
      try {
        await Option.updateOption(
          request.body.optionName,
          request.params.optionId
        );
        response.redirect(
          `/show/question/${request.params.electionId}/${request.params.questionId}/options`
        );
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }
);
app.get(
  "/election/:electionId/question/:questionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      const adminId = request.user.id;
      const question = await Question.findByPk(request.params.questionId);
      const admin = await Admin.findByPk(adminId);
      const election = await Election.findByPk(request.params.electionId);
      response.render("updatequestion", {
        userName: admin.name,
        election: election,
        question: question,
        csrfToken: request.csrfToken(),
      });
    }
  }
);
app.post(
  "/election/:electionId/question/:questionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      if (request.body.questionName.length < 5) {
        request.flash(
          "error",
          "Please write the question of atleast five characters"
        );
        return response.redirect(
          `/election/${request.params.electionId}/question/${request.params.questionId}/modify`
        );
      }
      try {
        await Question.updateQuestion(
          request.body.questionName,
          request.body.description,
          request.params.questionId
        );
        response.redirect(`/question/${request.params.electionId}`);
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }
);
app.get(
  "/voter/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      const election = await Election.findByPk(request.params.id);
      const electionlist = await Election.getAllElection(
        request.params.id,
        request.user.id
      );
      const listofvoter = await Voter.getAllVoter(request.params.id);

      if (request.accepts("html")) {
        response.render("voter", {
          title: election.electionName,
          election: election,
          id: request.params.id,
          voter: listofvoter,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({
          listofvoter,
        });
      }
    }
  }
);
app.get(
  "/newvoter/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      const voterlist = await Voter.getAllVoter(request.params.id);
      if (request.accepts("html")) {
        response.render("newvoter", {
          id: request.params.id,
          csrfToken: request.csrfToken({ voterlist }),
        });
      } else {
        return response.json({ voterlist });
      }
    }
  }
);

app.post(
  "/newvoter/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
      if (request.body.voterId.length == 0) {
        request.flash("error", "please enter voter Id");
        return response.redirect(`/newvoter/${request.params.id}`);
      }
      if (request.body.password.length < 3) {
        request.flash(
          "error",
          "Password must be of length atleast three character"
        );
        return response.redirect(`/newvoter/${request.params.id}`);
      }
      try {
        await Voter.addVoter(
          request.body.voterId,
          hashedPwd,
          request.params.id
        );
        return response.redirect(`/voter/${request.params.id}`);
      } catch (error) {
        console.log(error);
        request.flash("error", "voterid is in use.Give another Id");
        return response.redirect(`/newvoter/${request.params.id}`);
      }
    }
  }
);

app.get(
  "/election/:electionId/voter/:voterId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const election = await Election.findByPk(request.params.electionId);
    const voter = await Voter.findByPk(request.params.voterId);
    console.log(voter);
    response.render("updatevoter", {
      voter: voter,
      election: election,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/election/:electionId/voter/:voterId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Voter.changePassword(request.params.voterId, request.body.password);
      response.redirect(`/voter/${request.params.electionId}`);
    } catch (error) {
      console.log(error);
      return;
    }
  }
);
app.get(
  "/election/:electionId/question/:questionId/options/:optionId/change",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);
    const election = await Election.findByPk(request.params.electionId);
    const question = await Question.findByPk(request.params.questionId);
    const option = await Option.findByPk(request.params.optionId);
    response.render("updateoption", {
      username: admin.name,
      question: question,
      election: election,
      option: option,
      csrfToken: request.csrfToken(),
    });
  }
);
app.post(
  "/election/:electionId/question/:questionId/options/:optionId/change",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Option.updateOption(
        request.body.optionName,
        request.params.optionId
      );
      response.redirect(
        `/show/question/${request.params.electionId}/${request.params.questionId}/options`
      );
    } catch (error) {
      console.log(error);
      return;
    }
  }
);
app.delete(
  "/:id/voterdelete/:electionid",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      try {
        const election = Election.findByPk(request.params.electionid);
        const voter = Voter.findByPk(request.params.id);
        const res = await Voter.deleteVoter(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);
app.get("/voter/electionlist/:id", async (request, response) => {
  if (request.user.role === "admin") {
    try {
      const voter = await Voter.getAllVoter(request.params.id);
      const voter_count = await Voter.countVoter(request.params.id);
      const question = await Question.getAllQuestion(request.params.id);
      console.log("question=", question);
      const question_count = await Question.countQuestion(request.params.id);
      console.log("No of questions=", question_count);
      const election = await Election.findByPk(request.params.id);
      const electionName = await Election.getAllElection(
        request.params.id,
        request.user.id
      );
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
});
app.get("/voter/:urlName/", async (request, response) => {
//  console.log(request.csrfToken());
 // console.log(req.session)
  if (request.user === undefined) {
    request.flash("error", "First login before giving vote");
    return response.redirect(`/launch/${request.params.urlName}`);
  }
  const election = await Election.getElectionUrl(request.params.urlName);

  if (request.user.voted && election.launched) {
    request.flash("error", "Thank you for Voting");
    return response.redirect(`/voter/${request.params.urlName}/thank`);
  }

  try {
    const election = await Election.getElectionUrl(request.params.urlName);
    if (request.user.role === "voter") {
      if (election.launched) {
        let options = [];
        const question = await Question.getAllQuestion(election.id);
        for (let i = 0; i < question.length; i++) {
          const optionlist = await Option.getAllOption(question[i].id);
          options.push(optionlist);
        }
        return response.render("viewelection", {
          urlName: request.params.urlName,
          id: election.id,
          question,
          election,
          options,
          title: election.electionName,
          electionId: election.id,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.render("error");
      }
    } else if (request.user.role === "admin") {
      request.flash("error", "You have signed in as admin");
      return response.redirect(`/electionlist/${election.id}`);
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/voter/:urlName",
  passport.authenticate("voter-local", {
    failureRedirect: "back",
    failureFlash: true,
  }),
  async (request, response) => {
    return response.redirect(`/voter/${request.params.urlName}`);
  }
);
app.get("/voter/:urlName/thank", async (request, response) => {
  response.render("thank");
});
app.get(
  "/election/:id/launch",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      const question = await Question.findAll({
        where: { electionId: request.params.id },
      });
      if (question.length <= 1) {
        request.flash("error", "Please enter atleast two questions for Election!!!");
        return response.redirect(`/electionlist/${request.params.id}`);
      }

      for (let i = 0; i < question.length; i++) {
        const option = await Option.getAllOption(question[i].id);
        if (option.length <= 1) {
          request.flash("error","please add atleast two options to the question!!!");
          return response.redirect(`/electionlist/${request.params.id}`);
        }
      }

      const voters = await Voter.getAllVoter(request.params.id);
      if (voters.length <= 1) {
        request.flash("error","please enter atleast two voters to conduct election");
        return response.redirect(`/electionlist/${request.params.id}`);
      }

      try {
        await Election.launch(request.params.id);
        request.flash("", "Lauched election Sucessfully");
        return response.redirect(`/electionlist/${request.params.id}`);
      } catch (error) {
        console.log(error);
        return response.send(error);
      }
    }
  }
);

app.get("/launch/:urlName", async (request, response) => {
  try {
    let optionValue = [];
    let optionsNo = [];
    let questionNames = [];
    const election = await Election.getElectionUrl(request.params.urlName);
    const questionslist = await Question.getAllQuestion(election.id);
    const answerslist = await Answer.getAllAnswer(election.id);
    for (var i = 0; i < questionslist.length; i++) {
      questionNames.push(questionslist[i].questionName);
    }
    for (let i = 0; i < questionslist.length; i++) {
      let optionslist = await Option.getAllOption(questionslist[i].id);
      optionValue.push(optionslist);
      let answeroptions = [];
      console.log("LIST OF OPTIONS",optionslist);
      for (let j = 0; j < optionslist.length; j++) {
        let answerslist = await Answer.getCountOption(
          optionslist[j].id,
          election.id,
          questionslist[i].id
        );
        console.log("LIST OF Answers",answerslist);
       answeroptions.push(answerslist);
      }
      
      optionsNo.push(answeroptions);
    }
    if(election.launched){
      return response.render("voterlogin", {
        urlName: election.urlName,
        csrfToken: request.csrfToken(),
      });
    }
    else if (!election.launched && election.ended) {
      response.render("resultpage", {
        title: election.electionName,
        questionslist,
        optionValue,
        optionsNo,
        answerslist,
        questionnames,
      });
    } 
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});
app.get("/election/electionlist/:id", async (request, response) => {
  if (request.user.role === "admin") {
    try {
      const electionName = await Election.getAllElection(
        request.params.id,
        request.user.id
      );
      const countQuestion = await Question.countQuestion(request.params.id);
      const countVoter = await Voter.countVoter(request.params.id);
      const election = await Election.findByPk(request.params.id);
      response.render("manageelection", {
        urlName: election.urlName,
        election: election,
        id: request.params.id,
        title: electionName.electionName,
        countQuestion: countQuestion,
        countVoter: countVoter,
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
});
app.get(
  "/election/:id/displayelection",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      const election = await Election.findByPk(request.params.id);
      const optionsnew = [];
      const question = await Question.getAllQuestion(request.params.id);

      for (let i = 0; i < question.length; i++) {
        const optionlist = await Option.getAllOption(question[i].id);
        optionsnew.push(optionlist);
      }
      if (election.launched) {
        request.flash("error", "You can not preview election while Running");
        return response.redirect(`/electionlist/${request.params.id}`);
      }

      response.render("displayelection", {
        election: election,
        title: election.electionName,
        question: question,
        option: optionsnew,
        csrfToken: request.csrfToken(),
      });
    }
  }
);

app.get(
  "/election/:id/end",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      try {
        if (Election.launched === false) {
          request.flash("error", "election has not launched yet!!");
          return response.redirect(`/electionlist/${request.params.id}`);
        }
        await Election.end(request.params.id);
        return response.redirect(`/electionlist/${request.params.id}`);
      } catch (error) {
        console.log(error);
        return response.send(error);
      }
    }
  }
);
app.delete(
  "/deleteoption/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      try {
        const res = await Option.deleteOption(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);
app.delete(
  "/deletequestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.role === "admin") {
      try {
        const res = await Question.deleteQuestion(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  console.log(err);
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: err,
  });
});
module.exports = app;
