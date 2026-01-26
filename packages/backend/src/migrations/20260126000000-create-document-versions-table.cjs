"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create enum type for document version type
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE document_version_type AS ENUM ('quote_pdf', 'invoice_pdf', 'order_pdf');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // Create document_versions table
    await queryInterface.createTable("document_versions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      document_type: {
        type: "document_version_type",
        allowNull: false,
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "document_templates",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      generated_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      generated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      emailed_to: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      emailed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      email_subject: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      template_snapshot: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    })

    // Add indexes
    await queryInterface.addIndex("document_versions", ["document_id", "document_type"])
    await queryInterface.addIndex("document_versions", ["template_id"])
    await queryInterface.addIndex("document_versions", ["generated_by"])
    await queryInterface.addIndex("document_versions", ["generated_at"])

    // Add unique constraint for document + type + version
    await queryInterface.addIndex("document_versions", ["document_id", "document_type", "version"], {
      unique: true,
      name: "document_versions_unique_version",
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("document_versions")

    // Drop enum type
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS document_version_type;")
  },
}
