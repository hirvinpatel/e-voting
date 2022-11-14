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

describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(process.env.PORT ||4000, () => {});
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
  test("Creates a todo and responds with json at /todos POST endpoint", async () => {
    const res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Marks a todo with the given ID as complete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;

    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];
    const status = latestTodo.completed ? false : true;
    
    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
        completed:status
      });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
    
  });

  
  test("Deletes a todo with the given ID if it exists and sends a boolean response", async () => {
    // FILL IN YOUR CODE HERE
    var res = await agent.get("/");
    var csrfToken = extractCsrfToken(res);
   await agent.post("/todos").send({
      title: "Buy xbox1",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;

    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    const todoID = latestTodo.id;
    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const deletedTodo = await agent.delete(`/todos/${todoID}`).send({ _csrf: csrfToken });

    expect(deletedTodo.text).toBe("true");
  });
});
