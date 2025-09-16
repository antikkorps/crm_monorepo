'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tasks', 'contact_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'contact_persons',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Add index for performance
    await queryInterface.addIndex('tasks', ['contact_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('tasks', ['contact_id']);
    await queryInterface.removeColumn('tasks', 'contact_id');
  }
};
