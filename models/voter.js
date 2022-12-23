'use strict';
const {  Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Voter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Voter.belongsTo(models.Election, {
        foreignKey: "electionId",
      });
    }
    static addVoter(voterId, password, electionId) {
      return this.create({
        voterId: voterId,
        password: password,
        electionId: electionId,
        voted: false,               
      });
    }

    static async getAllVoter(electionId) {
      return await this.findAll({
        where: {
          electionId,
        },
        order: [["id", "ASC"]],
      });
    }

    static async countVoter(electionId) {
      return await this.count({
        where: {
          electionId,
        },
      });
    }
    static deleteVoter(voterId) {
      return this.destroy({
        where: {
          voterId,
        },
      });
    }

  }
  Voter.init({
    voterId: DataTypes.STRING,
    password: DataTypes.STRING,
    voted: DataTypes.BOOLEAN
  },
   {
    sequelize,
    modelName: 'Voter',
  });
  return Voter;
};