"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create enum types first
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE template_type AS ENUM ('quote', 'invoice', 'both');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE logo_position AS ENUM ('top_left', 'top_center', 'top_right', 'header_left', 'header_right');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // Create document_templates table
    await queryInterface.createTable("document_templates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: "template_type",
        allowNull: false,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      company_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      company_address: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      company_phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      company_email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      company_website: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tax_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      vat_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      siret_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      registration_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      logo_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      logo_position: {
        type: "logo_position",
        allowNull: false,
        defaultValue: "top_left",
      },
      primary_color: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      secondary_color: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      header_height: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 80,
      },
      footer_height: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
      },
      margin_top: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20,
      },
      margin_bottom: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20,
      },
      margin_left: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 15,
      },
      margin_right: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 15,
      },
      custom_header: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      custom_footer: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      terms_and_conditions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      payment_instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      html_template: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      styles: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
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
    await queryInterface.addIndex("document_templates", ["type"])
    await queryInterface.addIndex("document_templates", ["is_default"])
    await queryInterface.addIndex("document_templates", ["is_active"])
    await queryInterface.addIndex("document_templates", ["created_by"])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("document_templates")

    // Drop enum types
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS template_type;")
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS logo_position;")
  },
}
