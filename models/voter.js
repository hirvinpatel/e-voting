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
      Voter.hasMany(models.Answer, {
        foreignKey: "voterId",
        onDelete: "CASCADE",
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

    static getAllVoter(electionId) {
      return this.findAll({
        where: {
          electionId,
        },
        order: [["id", "ASC"]],
      });
    }

    static countVoter(electionId) {
      return this.count({
        where: {
          electionId,
        },
      });
    }
    static changePassword(voterId, newpassword) {
      return this.update(
        {
          password: newpassword,
        },
        {
          where: {
            voterId: voterId,
          },
        }
      );
    }
    static deleteVoter(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

  }
  Voter.init({
    voterId:
    {
      type: DataTypes.INTEGER,
      unique: true,
    },
    password: DataTypes.STRING,
    voted: DataTypes.BOOLEAN,
    role:DataTypes.STRING,
  },
   {
    sequelize,
    modelName: 'Voter',
  });
  return Voter;
};