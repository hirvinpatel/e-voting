'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Question.belongsTo(models.Election, {
        foreignKey: "electionId",
      });
      Question.hasMany(models.Option, {
        foreignKey: "questionId",
      });
    }
    static addQuestion(questionName, description, electionId) {
      return this.create({
        questionName: questionName,
        description: description,
        electionId: electionId,             
      });
    }
    static async countQuestion(electionId) {
      return await this.count({
        where: {
          electionId,
        },
      });
    }
    static getQuestion(id) {
      return this.findOne({
        where: {
          id,
        },
        order: [["id", "ASC"]],
      });
    }
    static getAllQuestion(id) {
      return this.findAll({
        where: {
          id,
        },
        order: [["id", "ASC"]],
      });
    }
    static updateQuestion(questionName, desctiption, questionId) {
      return this.update(
        {
          questionName: questionName,
          description: desctiption,
        },
        {
          where: {
            id: questionId,
          },
        }
      );
    }
    static deleteQuestion(questionId) {
      return this.destroy({
        where: {
          questionId,
        },
      });
    }

  }
  Question.init({
    questionName: DataTypes.STRING,
    description: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Question',
  });
  return Question;
};