'use strict';
const {  Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Election.belongsTo(models.Admin, {
        foreignKey: "adminId",
      });
      Election.hasMany(models.Voter,{
        foreignKey: "electionId",
      });
      Election.hasMany(models.Question,{
        foreignKey: "electionId",
      })
    }

    static addElection({ electionName, adminId, urlName }) {
      return this.create({
        electionName:electionName,
        adminId: adminId,
        urlName: urlName,
      
      });
    }

    static getElectionUrl(urlName) {
      return this.findone({
        where:
        {
          urlName,
        },
         order: [["id", "ASC"]] ,
        });
    }
    static getUrlName(urlName) {
      return this.findone({
        where:
        {
          urlName,
        },
      });
    }
    static getElection(adminId) {
      return this.findOne({
        where: {
          adminId,
        },
        order: [["id", "ASC"]],
      });
    }
    static getAllElection(adminId) {
      return this.findAll({
        where: {
          adminId,
        },
        order: [["id", "ASC"]],
      });
    }
    static launch(id) {
      return this.update(
        {
          launched: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }
    static end(id) {
      return this.Election.update(
        {
          ended: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }
   
   
  }
  Election.init({
    electionName: DataTypes.STRING,
    urlName: DataTypes.STRING,
    completed: DataTypes.BOOLEAN,
    launched: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Election',
  });
  return Election;
};