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

  test("Sign out", async () => {
    let res = await agent.get("/election");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/election");
    expect(res.statusCode).toBe(302);
  });

  test("Create an election", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    const res = await agent.get("/createelection");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/election").send({
    electionName: "Bank Manager",
    _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Testing of Adding Question", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Bank Manager",
    _csrf: csrfToken,
    });
    const groupedElectionResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionResponse.text);
    const electionCount = parsedGroupedResponse.electionlist.length;

    const latestElection = parsedGroupedResponse.electionlist[electionCount - 1];
   
    res = await agent.get(`/createquestion/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);

    const response=await agent
      .post(`/createquestion/${latestElection.id}`)
      .send({
        _csrf: csrfToken,
        questionName:"Bank Manager Name",
        description:"Manager Name",
      });

      expect(response.statusCode).toBe(302);
  });

  test("Deletes a Question the given ID if it exists and sends a boolean response", async () => {
    // FILL IN YOUR CODE HERE
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/createelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      electionName: "Bank Manager",
    _csrf: csrfToken,
    });
    const groupedElectionResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionResponse.text);
    const electionCount = parsedGroupedResponse.electionlist.length;

    const latestElection = parsedGroupedResponse.electionlist[electionCount - 1];
   
    res = await agent.get(`/createquestion/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);

    let response=await agent
      .post(`/createquestion/${latestElection.id}`)
      .send({
        _csrf: csrfToken,
        questionName:"Bank Manager Name",
        description:"Manager Name",
      });

      response=await agent
      .post(`/createquestion/${latestElection.id}`)
      .send({
        _csrf: csrfToken,
        questionName:"Branch name",
        description:"Branch Name",
      });

      const groupedQuestionResponse = await agent
      .get(`/question/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedGroupedQuestionResponse = JSON.parse(groupedQuestionResponse.text);
    const questionCount = parsedGroupedQuestionResponse.questionlist.length;

    const latestQuestion = parsedGroupedQuestionResponse.questionlist[questionCount - 1];
   
    res = await agent.get(`/question/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    const deletedQuestion = await agent
      .delete(`/deletequestion/${latestQuestion.id}`)
      .send({ _csrf: csrfToken });
      const parsedDeletedResponse = JSON.parse(deletedQuestion.text).success;
      expect(parsedDeletedResponse).toBe(true);
      });
});
