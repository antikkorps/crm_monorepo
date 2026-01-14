"use strict"

/**
 * Migration to create password_reset_tokens table for secure password reset flow.
 *
 * This table provides:
 * - Secure 6-digit code storage for password reset
 * - Token expiration (15 minutes)
 * - Used token tracking to prevent reuse
 * - Audit trail of password reset attempts
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("password_reset_tokens", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "User who requested the password reset",
      },
      code: {
        type: Sequelize.STRING(6),
        allowNull: false,
        comment: "6-digit verification code sent to user's email",
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: "Expiration timestamp (15 minutes from creation)",
      },
      used: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether this token has been used",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "created_at",
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "updated_at",
      },
    })

    console.log("Creating indexes for password_reset_tokens...")

    // Index for finding tokens by user
    await queryInterface.addIndex("password_reset_tokens", {
      name: "idx_password_reset_user",
      fields: ["user_id"],
      comment: "Find all password reset tokens for a user",
    })

    // Index for code lookup (used during verification)
    await queryInterface.addIndex("password_reset_tokens", {
      name: "idx_password_reset_code",
      fields: ["code"],
      comment: "Quick lookup for code verification",
    })

    // Index for finding unused tokens
    await queryInterface.addIndex("password_reset_tokens", {
      name: "idx_password_reset_used",
      fields: ["used"],
      comment: "Filter for unused tokens",
    })

    // Index for expiration cleanup
    await queryInterface.addIndex("password_reset_tokens", {
      name: "idx_password_reset_expires",
      fields: ["expires_at"],
      comment: "Cleanup expired tokens",
    })

    console.log("✓ password_reset_tokens table created with 4 indexes")
  },

  down: async (queryInterface, Sequelize) => {
    console.log("Dropping password_reset_tokens table...")
    await queryInterface.dropTable("password_reset_tokens")
    console.log("✓ password_reset_tokens table dropped")
  },
}
