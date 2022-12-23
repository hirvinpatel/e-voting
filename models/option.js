'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Option extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Option.belongsTo(models.Question, {
        foreignKey: "questionId",
        onDelete: "CASCADE",
      });
    }
    static addOption(optionName, questionId) {
      return this.create({
        optionName: optionName,
        questionId: questionId,                   
      });
    }
   
    static getOption(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }
    static getAllOption(id) {
      return this.findAll({
        where: {
          id,
        },
        order: [["id", "ASC"]],
      });
    }
    static updateOption(newOption, questionId) {
      return this.update(
        {
          optionName: newOption,
        },
        {
          where: {
            id: questionId,
          },
        }
      );
    }
    static deleteOption(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

  }
  Option.init({
    optionName: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Option',
  });
  return Option;
};