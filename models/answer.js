'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Answer extends Model {
    static addAnswer({ voterId, electionId, questionId, optionSelected }) {
      return this.create({
        electionId,
        questionId,
        voterId,
        optionSelected,
      });
    }

    static getAllAnswer(electionId) {
      return this.findAll({
        where: {
          electionId,
        },
      });
    }

    static getCountOption(optionSelected, electionId, questionId) {
      return this.count({
        where: {
          optionSelected,
          electionId,
          questionId
        },
      });
    }

    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Answer.belongsTo(models.Election, {
        foreignKey: "electionId",
      });

      Answer.belongsTo(models.Question, {
        foreignKey: "questionId",
      });

      Answer.belongsTo(models.Voter, {
        foreignKey: "voterId",
        onDelete: "CASCADE",
      });
      Answer.belongsTo(models.Option, {
        foreignKey: "optionSelected",
        onDelete: "CASCADE",
      });
    
    }
  }
  Answer.init(
    {},
    {
      sequelize,
      modelName: "Answer",
    }
  );
  return Answer;
};