/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new enum value 'ordered' to quotes status
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_quotes_status" ADD VALUE IF NOT EXISTS \'ordered\';'
    )

    // Add order_number and ordered_at columns if not exists
    const table = await queryInterface.describeTable('quotes')

    if (!table['order_number']) {
      await queryInterface.addColumn('quotes', 'order_number', {
        type: Sequelize.STRING,
        allowNull: true,
      })
      await queryInterface.addIndex('quotes', ['order_number'])
    }

    if (!table['ordered_at']) {
      await queryInterface.addColumn('quotes', 'ordered_at', {
        type: Sequelize.DATE,
        allowNull: true,
      })
      await queryInterface.addIndex('quotes', ['ordered_at'])
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove columns (cannot easily remove enum value from Postgres enum safely)
    const table = await queryInterface.describeTable('quotes')
    if (table['order_number']) {
      await queryInterface.removeIndex('quotes', ['order_number'])
      await queryInterface.removeColumn('quotes', 'order_number')
    }
    if (table['ordered_at']) {
      await queryInterface.removeIndex('quotes', ['ordered_at'])
      await queryInterface.removeColumn('quotes', 'ordered_at')
    }
  },
}

