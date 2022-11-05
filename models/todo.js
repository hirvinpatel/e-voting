"use strict";
const { Op,Model } = require("sequelize");
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
    markAsCompleted() {
      return this.update({ completed: true });
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
    static dueLater() {
      return this.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date().toISOString(),
          },
        },
        order: [["id", "ASC"]],
      });
    }

    static dueToday() {
      return this.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date().toISOString(),
          },
        },
        order: [["id", "ASC"]],
      });
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
