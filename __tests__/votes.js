const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
//const { JSON } = require("sequelize");

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
  //res.render(req.flash(type, message));
};
describe("Voting Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(process.env.PORT || 4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign Up", async () => {
    let res = await agent.get("/signup");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/admin").send({
      firstName: "Aneri",
      lastName: "Patel",
      email: "aneripatel@gmail.com",
      password: "111",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
    //res.render(req.flash(type, message));
  });
  test("Test of Login ", async () => {
    res = await agent.get("/election");
    console.log("statuscode=", res.statusCode);
    expect(res.statusCode).toBe(200);
    await login(agent, "aneripatel@gmail.com", "111");
    res = await agent.get("/election");
    expect(res.statusCode).toBe(200);
  });

  test("Test of Sign out", async () => {
    let res = await agent.get("/election");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/election");
    expect(res.statusCode).toBe(302);
  });

  test("Test of Creating an election", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    const res = await agent.get("/createelection");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/election").send({
      electionName: "Bank Manager",
      urlName: "Manager",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Test of Adding Question in Election", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Bank Manager",
      urlName: "Manager",
      _csrf: csrfToken,
    });
    const groupedElectionResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    console.log("GroupedElectionResponse=", groupedElectionResponse);
    if (groupedElectionResponse.length > 0) {
      const parsedGroupedResponse = JSON.parse(groupedElectionResponse.text);
      const noOfElection = parsedGroupedResponse.electionlist.length;

      const lastElection = parsedGroupedResponse.electionlist[noOfElection - 1];

      res = await agent.get(`/createquestion/${lastElection.id}`);
      csrfToken = extractCsrfToken(res);

      const response = await agent
        .post(`/createquestion/${lastElection.id}`)
        .send({
          _csrf: csrfToken,
          questionName: "Bank Manager Name",
          description: "Manager Name",
        });

      expect(response.statusCode).toBe(302);
    }
  });
  test("Test Adding an option in Question", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");

    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Bank Manager",
      publicurl: "Manager",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    if (ElectionsResponse.length > 0) {
      const parsedGroupedResponse = JSON.parse(ElectionsResponse.text);
      const noOfElection = parsedGroupedResponse.electionlist.length;
      const lastElection = parsedGroupedResponse.electionlist[noOfElection - 1];
      res = await agent.get(`/createquestion/${lastElection.id}`);
      csrfToken = extractCsrfToken(res);
      await agent.post(`/createquestion/${lastElection.id}`).send({
        questionname: "Manager Name",
        description: "Name",
        _csrf: csrfToken,
      });
      const QuestionsResponse = await agent
        .get(`/question/${lastElection.id}`)
        .set("Accept", "application/json");
      if (QuestionsResponse.length > 0) {
        const parsedquestionsGroupedResponse = JSON.parse(QuestionsResponse.text);
        const questionCount = parsedquestionsGroupedResponse.questionlist.length;
        const lastQuestion =parsedquestionsGroupedResponse.questionlist[questionCount - 1];
       res = await agent.get(`/show/question/${lastElection.id}/${lastQuestion.id}/options`);
        csrfToken = extractCsrfToken(res);
       res = await agent.post(`/show/question/${lastElection.id}/${lastQuestion.id}/options`)
          .send({
            _csrf: csrfToken,
            optionname: "Aneri",
          });
        expect(res.statusCode).toBe(302);
      }
    }
  });

  test("Test Adding a voter in Election", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Bank Manager",
      publicurl: "manager",
      _csrf: csrfToken,
    });
    const groupedResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    if (groupedResponse.length > 0) {
      const parsedResponse = JSON.parse(groupedResponse.text);
      const noOfElection = parsedResponse.electionlist.length;
      const lastElection = parsedResponse.electionlist[noOfElection - 1];
      res = await agent.get(`/newvoter/${lastElection.id}`);
      csrfToken = extractCsrfToken(res);
      let response = await agent.post(`/newvoter/${lastElection.id}`).send({
        voterid: "111",
        password: "111",
        _csrf: csrfToken,
      });
      expect(response.statusCode).toBe(302);
    }
  });
  test("Test Deleting a Question from Election", async () => {
     await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Bank Manager",
      urlName: "Manager",
      _csrf: csrfToken,
    });
    const groupedElectionResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    if (groupedElectionResponse.length > 0) {
      const parsedGroupedResponse = JSON.parse(groupedElectionResponse.text);
      const noOfElection = parsedGroupedResponse.electionlist.length;
      const lastElection = parsedGroupedResponse.electionlist[noOfElection - 1];
      res = await agent.get(`/createquestion/${lastElection.id}`);
      csrfToken = extractCsrfToken(res);
      let response = await agent
        .post(`/createquestion/${lastElection.id}`)
        .send({
          _csrf: csrfToken,
          questionName: "Bank Manager Name",
          description: "Manager Name",
        });
      response = await agent.post(`/createquestion/${lastElection.id}`).send({
        _csrf: csrfToken,
        questionName: "Branch name",
        description: "Branch Name",
      });
      const groupedQuestionResponse = await agent
        .get(`/question/${lastElection.id}`)
        .set("Accept", "application/json");
      const parsedGroupedQuestionResponse = JSON.parse(
        groupedQuestionResponse.text
      );
      const questionCount = parsedGroupedQuestionResponse.questionlist.length;
      const lastQuestion =
      parsedGroupedQuestionResponse.questionlist[questionCount - 1];
      res = await agent.get(`/question/${lastElection.id}`);
      csrfToken = extractCsrfToken(res);
      const deletedQuestion = await agent
        .delete(`/deletequestion/${lastQuestion.id}`)
        .send({ _csrf: csrfToken });
      const parsedDeletedResponse = JSON.parse(deletedQuestion.text).success;
      expect(parsedDeletedResponse).toBe(false);
    }
  });
  test("Test Deleting an option from Question", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Bank Manger",
      publicurl: "Manager",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    if (ElectionsResponse.length > 0) {
      const parsedElectionsResponse = JSON.parse(ElectionsResponse.text);
      const noOfElection = parsedElectionsResponse.electionlist.length;
      const lastElection =
      parsedElectionsResponse.electionlist[noOfElection - 1];
      res = await agent.get(`/createquestion/${lastElection.id}`);
      csrfToken = extractCsrfToken(res);
      await agent.post(`/createquestion/${lastElection.id}`).send({
        questionname: "Manger Name",
        description: "Manager name",
        _csrf: csrfToken,
      });
      const QuestionsResponse = await agent
        .get(`/question/${lastElection.id}`)
        .set("Accept", "application/json");
      if (QuestionsResponse.length > 0) {
        const parsedGroupedResponse = JSON.parse(QuestionsResponse.text);
        const questionCount = parsedGroupedResponse.questionslist.length;
        const lastQuestion = parsedGroupedResponse.questionslist[questionCount - 1];
        res = await agent.get(`/show/question/${lastElection.id}/${lastQuestion.id}/options`);
        csrfToken = extractCsrfToken(res);
        res = await agent.post(`/show/question/${lastElection.id}/${lastQuestion.id}/options`)
          .send({
            _csrf: csrfToken,
            optionname: "Aneri",
          });

        const OptionsResponse = await agent
          .get(`/show/question/${lastElection.id}/${lastQuestion.id}/options`)
          .set("Accept", "application/json");
        if (OptionsResponse.length > 0) {
          const parsedoptionGroupedResponse = JSON.parse(OptionsResponse.text);
          console.log(parsedoptionGroupedResponse);
          const optionsCount = parsedoptionGroupedResponse.option.length;
          const lastOption = parsedoptionGroupedResponse.option[optionsCount - 1];
          res = await agent.get(`/show/question/${lastElection.id}/${lastQuestion.id}/options`);
          csrfToken = extractCsrfToken(res);
          const deleteResponse = await agent
            .delete(`/${lastOption.id}/deleteoptions`)
            .send({
              _csrf: csrfToken,
            });
          const DeleteResponse = JSON.parse(deleteResponse.text).success;
          expect(DeleteResponse).toBe(true);
          res = await agent.get(`/show/question/${lastElection.id}/${lastQuestion.id}/options`);
          csrfToken = extractCsrfToken(res);
          const deleteResponse2 = await agent.delete(`/${lastOption.id}/deleteoptions`)
            .send({
              _csrf: csrfToken,
            });
          const DeleteResponse2 = JSON.parse(deleteResponse2.text).success;
          expect(DeleteResponse2).toBe(false);
        }
      }
    }
  });
  test("Test of Deleting a voter from Election", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");

    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Bank Manager",
      publicurl: "Manager",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    if (ElectionsResponse.length > 0) {
      const parsedElectionsResponse = JSON.parse(ElectionsResponse.text);
      const noOfElection = parsedElectionsResponse.electionlist.length;
      const lastElection = parsedElectionsResponse.electionlist[noOfElection - 1];
      res = await agent.get(`/newvoter/${lastElection.id}`);
      csrfToken = extractCsrfToken(res);
      await agent.post(`/newvoter/${lastElection.id}`).send({
        voterid: "55",
        password: "556",
        _csrf: csrfToken,
      });
      const voterResponse = await agent
        .get(`/newvoter/${lastElection.id}`)
        .set("Accept", "application/json");
      if (voterResponse.length > 0) {
        const parsedGroupedResponse = JSON.parse(voterResponse.text);
        const voterCount = parsedGroupedResponse.voterlist.length;
        const latestvoter = parsedGroupedResponse.voterlist[voterCount - 1];
        res = await agent.get(`/voter/${latestvoter.id}`);
        csrfToken = extractCsrfToken(res);
        const deleteresponse = await agent .delete(`/${latestvoter.id}/voterdelete/${lastElection.id}`)
          .send({
            _csrf: csrfToken,
          });
        const parseddeleteResponse = JSON.parse(deleteresponse.text);
        expect(parseddeleteResponse.success).toBe(true);
      }
    }
  });

  test("Test of  updating a question", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Bank Manager",
      publicurl: "Manager",
      _csrf: csrfToken,
    });
    const groupedResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    if (groupedResponse.length > 0) {
      const parsedGroupedResponse = JSON.parse(groupedResponse.text);
      const noOfElection = parsedGroupedResponse.electionlist.length;
      const lastElection = parsedGroupedResponse.electionlist[noOfElection - 1];
      res = await agent.get(`/createquestion/${lastElection.id}`);
      csrfToken = extractCsrfToken(res);
      await agent.post(`/createquestion/${lastElection.id}`).send({
        questionName: "Manager Name",
        description: "Manager name",
        _csrf: csrfToken,
      });
      const QuestionsResponse = await agent
        .get(`/question/${lastElection.id}`)
        .set("Accept", "application/json");
      const parsedquestionGroupedResponse = JSON.parse(QuestionsResponse.text);
      const questionCount = parsedquestionGroupedResponse.questionlist.length;
      const lastQuestion = parsedquestionGroupedResponse.questions1[questionCount - 1];
      res = await agent.get(`/election/${lastElection.id}/question/${lastQuestion.id}/modify`);
      csrfToken = extractCsrfToken(res);
      res = await agent.post(`/election/${lastElection.id}/question/${lastQuestion.id}/modify`)
        .send({
          _csrf: csrfToken,
          questionname: "what is qualification?",
          description: "Degree name",
        });
      expect(res.statusCode).toBe(302);
    }
  });
  test("Test of  updating an option", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Class Monitor",
      publicurl: "monitor",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    if (ElectionsResponse.length > 0) {
      const parsedElectionsResponse = JSON.parse(ElectionsResponse.text);
      const noOfElection = parsedElectionsResponse.electionlist.length;
      const lastElection =parsedElectionsResponse.electionlist[noOfElection - 1];
      res = await agent.get(`/createquestion/${lastElection.id}`);
      csrfToken = extractCsrfToken(res);
      await agent.post(`/createquestion/${lastElection.id}`).send({
        questionname: "Monitor Name",
        description: "monitor name",
        _csrf: csrfToken,
      });
      const QuestionsResponse = await agent
        .get(`/question/${lastElection.id}`)
        .set("Accept", "application/json");
      if (QuestionsResponse.length > 0) {
        const parsedGroupedResponse = JSON.parse(QuestionsResponse.text);
        const questionCount = parsedGroupedResponse.questionslist.length;
        const lastQuestion =parsedGroupedResponse.questionslist[questionCount - 1];
        res = await agent.get(`/show/question/${lastElection.id}/${lastQuestion.id}/options`);
        csrfToken = extractCsrfToken(res);
        res = await agent.post(`/show/question/${lastElection.id}/${lastQuestion.id}/options`)
          .send({
            _csrf: csrfToken,
            optionname: "Ayushi",
          });

        const OptionsResponse = await agent
          .get(`/show/question/${lastElection.id}/${lastQuestion.id}/options`)
          .set("Accept", "application/json");
        if (OptionsResponse.length > 0) {
          const parsedoptionGroupedResponse = JSON.parse(OptionsResponse.text);
          console.log(parsedoptionGroupedResponse);
          const optionsCount = parsedoptionGroupedResponse.option.length;
          const lastOption =parsedoptionGroupedResponse.option[optionsCount - 1];
         res = await agent.get(`/election/${lastElection.id}/question/${lastQuestion.id}/options/${lastOption.id}/change`);
          csrfToken = extractCsrfToken(res);
         res = await agent.post(`/election/${lastElection.id}/question/${lastQuestion.id}/options/${lastOption.id}/change`)
            .send({
              _csrf: csrfToken,
              optionname: "Joyatri",
            });
          expect(res.statusCode).toBe(302);
        }
      }
    }
  });
  test("Test of Viewing Election", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Class Monitor",
      publicurl: "monitor",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    if (ElectionsResponse.length > 0) {
      const parsedElectionsResponse = JSON.parse(ElectionsResponse.text);
      const noOfElection = parsedElectionsResponse.electionlist.length;
      const lastElection = parsedElectionsResponse.electionlist[noOfElection - 1];
      res = await agent.get(`/election/${lastElection.id}/displayelection`);
      csrfToken = extractCsrfToken(res);
      expect(res.statusCode).toBe(200);
    }
  });
  test("Test of voter login to cast vote", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Class Monitor",
      publicurl: "monitor",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/election")
      .set("Accept", "Application/json");
    if (ElectionsResponse.length > 0) {
      const parsedElectionsResponse = JSON.parse(ElectionsResponse.text);
      const noOfElection = parsedElectionsResponse.electionlist.length;
      const electionlist = parsedElectionsResponse.electionlist[noOfElection - 1];
      await agent.get("/signout");
      let voterview = await agent.get(`/launch/${electionlist.urlName}`);
      csrfToken = extractCsrfToken(voterview);
      res = await agent.post(`/voter/${electionlist.urlName}`).send({
        VoterID: "55",
        password: "556",
        _csrf: csrfToken,
      });
      expect(res.statusCode).toBe(302);
    }
  });
});
