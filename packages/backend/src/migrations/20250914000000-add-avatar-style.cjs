const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add avatar_style column to users table
    await queryInterface.addColumn('users', 'avatar_style', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'avataaars',
    });

    // Update existing users to have the default avatar style
    await queryInterface.sequelize.query(
      `UPDATE users SET avatar_style = 'avataaars' WHERE avatar_style IS NULL;`
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove avatar_style column from users table
    await queryInterface.removeColumn('users', 'avatar_style');
  },
};