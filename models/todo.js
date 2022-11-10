"use strict";
const { Op, Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    static associate(models) {
      // define association here
    }

    static addTodo({ title, dueDate }) {
      return this.create({ title: title, dueDate: dueDate, completed: false });
    }

    static getTodos() {
      return this.findAll();
    }

    static overDue() {
      return this.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date().toISOString(),
          },
        },
        order: [["id", "ASC"]],
      });
    }
    static async dueLater() {
      return this.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date().toISOString(),
          },
        },
        order: [["id", "ASC"]],
      });
    }

    static async dueToday() {
      return this.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date().toISOString(),
          },
        },
        order: [["id", "ASC"]],
      });
    }
    static async remove(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

    markAsCompleted() {
      return this.update({ completed: true });
    }
  }
  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
