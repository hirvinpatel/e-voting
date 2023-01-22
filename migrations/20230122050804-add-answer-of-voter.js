"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
  await queryInterface.addColumn("Answers", "electionId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("Answers", {
      fields: ["electionId"],
      type: "foreign key",
      references: {
        table: "Elections",
        field: "id",
      },
    });
    await queryInterface.addColumn("Answers", "questionId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("Answers", {
      fields: ["questionId"],
      type: "foreign key",
      references: {
        table: "Questions",
        field: "id",
      },
    });
    await queryInterface.addColumn("Answers", "voterId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("Answers", {
      fields: ["voterId"],
      type: "foreign key",
      references: {
        table: "Voters",
        field: "id",
      },
    });

    await queryInterface.addColumn("Answers", "optionSelected", {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
    });
    await queryInterface.addConstraint("Answers", {
      fields: ["optionSelected"],
      type: "foreign key",
      references: {
        table: "Options",
        field: "id",
      },
    });
    
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Answers", "voterId");
    await queryInterface.removeColumn("Answers", "electionId");
    await queryInterface.removeColumn("Answers", "questionId");
    await queryInterface.removeColumn("Answers", "optionSelected");
  },
};

