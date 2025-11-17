"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName)
        return !!tableDescription[columnName]
      } catch (error) {
        return false
      }
    }

    // Add contact_person_id column if it doesn't exist
    if (!(await columnExists("meeting_participants", "contact_person_id"))) {
      await queryInterface.addColumn("meeting_participants", "contact_person_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "contact_persons",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      })
    }

    // Modify user_id to be nullable (since we can have either user_id or contact_person_id)
    await queryInterface.changeColumn("meeting_participants", "user_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    })

    // Drop the old unique constraint
    try {
      await queryInterface.removeConstraint(
        "meeting_participants",
        "unique_meeting_participant_per_user"
      )
    } catch (error) {
      console.log("Constraint unique_meeting_participant_per_user does not exist, skipping...")
    }

    // Add new unique constraint that covers both user_id and contact_person_id
    try {
      await queryInterface.addConstraint("meeting_participants", {
        fields: ["meeting_id", "user_id"],
        type: "unique",
        name: "unique_meeting_user_participant",
        where: {
          user_id: { [Sequelize.Op.ne]: null },
        },
      })
    } catch (error) {
      console.log("Constraint unique_meeting_user_participant already exists, skipping...")
    }

    try {
      await queryInterface.addConstraint("meeting_participants", {
        fields: ["meeting_id", "contact_person_id"],
        type: "unique",
        name: "unique_meeting_contact_participant",
        where: {
          contact_person_id: { [Sequelize.Op.ne]: null },
        },
      })
    } catch (error) {
      console.log("Constraint unique_meeting_contact_participant already exists, skipping...")
    }

    // Add index for contact_person_id
    try {
      await queryInterface.addIndex("meeting_participants", ["contact_person_id"])
    } catch (error) {
      console.log("Index on contact_person_id already exists, skipping...")
    }

    // Add check constraint to ensure either user_id or contact_person_id is set (but not both)
    try {
      await queryInterface.addConstraint("meeting_participants", {
        type: "check",
        name: "check_participant_type",
        where: Sequelize.literal(
          "(user_id IS NOT NULL AND contact_person_id IS NULL) OR (user_id IS NULL AND contact_person_id IS NOT NULL)"
        ),
      })
    } catch (error) {
      console.log("Check constraint already exists, skipping...")
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove check constraint
    try {
      await queryInterface.removeConstraint("meeting_participants", "check_participant_type")
    } catch (error) {
      console.log("Check constraint does not exist, skipping...")
    }

    // Remove unique constraints
    try {
      await queryInterface.removeConstraint(
        "meeting_participants",
        "unique_meeting_user_participant"
      )
    } catch (error) {
      console.log("Constraint unique_meeting_user_participant does not exist, skipping...")
    }

    try {
      await queryInterface.removeConstraint(
        "meeting_participants",
        "unique_meeting_contact_participant"
      )
    } catch (error) {
      console.log("Constraint unique_meeting_contact_participant does not exist, skipping...")
    }

    // Re-add the old unique constraint
    try {
      await queryInterface.addConstraint("meeting_participants", {
        fields: ["meeting_id", "user_id"],
        type: "unique",
        name: "unique_meeting_participant_per_user",
      })
    } catch (error) {
      console.log("Failed to re-add old constraint...")
    }

    // Remove contact_person_id column
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName)
        return !!tableDescription[columnName]
      } catch (error) {
        return false
      }
    }

    if (await columnExists("meeting_participants", "contact_person_id")) {
      await queryInterface.removeColumn("meeting_participants", "contact_person_id")
    }

    // Restore user_id to be non-nullable
    await queryInterface.changeColumn("meeting_participants", "user_id", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    })
  },
}
