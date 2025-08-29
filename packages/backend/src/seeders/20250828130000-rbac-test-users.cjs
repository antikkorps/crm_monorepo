const bcrypt = require("bcryptjs")
const { v4: uuidv4 } = require("uuid")

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const saltRounds = 10
    const now = new Date()

    // Create test teams first
    const teams = [
      {
        id: uuidv4(),
        name: "Sales Team Alpha",
        description: "Primary sales team for medical institutions",
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        name: "Sales Team Beta",
        description: "Secondary sales team for specialized clinics",
        created_at: now,
        updated_at: now,
      },
    ]

    // Insert teams (if teams table exists)
    try {
      await queryInterface.bulkInsert("teams", teams, {})
    } catch (error) {
      console.log("Teams table does not exist yet, skipping team creation")
    }

    // Create test users with different roles
    const users = [
      {
        id: uuidv4(),
        email: "superadmin@medical-crm.com",
        password_hash: await bcrypt.hash("SuperAdmin123!", saltRounds),
        first_name: "Super",
        last_name: "Administrator",
        role: "super_admin",
        team_id: null, // Super admins don't belong to specific teams
        avatar_seed: "super-administrator",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        email: "teamadmin1@medical-crm.com",
        password_hash: await bcrypt.hash("TeamAdmin123!", saltRounds),
        first_name: "Alice",
        last_name: "Johnson",
        role: "team_admin",
        team_id: teams[0].id,
        avatar_seed: "alice-johnson",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        email: "teamadmin2@medical-crm.com",
        password_hash: await bcrypt.hash("TeamAdmin123!", saltRounds),
        first_name: "Bob",
        last_name: "Smith",
        role: "team_admin",
        team_id: teams[1].id,
        avatar_seed: "bob-smith",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        email: "user1@medical-crm.com",
        password_hash: await bcrypt.hash("User123!", saltRounds),
        first_name: "Charlie",
        last_name: "Brown",
        role: "user",
        team_id: teams[0].id,
        avatar_seed: "charlie-brown",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        email: "user2@medical-crm.com",
        password_hash: await bcrypt.hash("User123!", saltRounds),
        first_name: "Diana",
        last_name: "Wilson",
        role: "user",
        team_id: teams[0].id,
        avatar_seed: "diana-wilson",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        email: "user3@medical-crm.com",
        password_hash: await bcrypt.hash("User123!", saltRounds),
        first_name: "Edward",
        last_name: "Davis",
        role: "user",
        team_id: teams[1].id,
        avatar_seed: "edward-davis",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]

    await queryInterface.bulkInsert("users", users, {})

    console.log("RBAC test users created:")
    console.log("Super Admin: superadmin@medical-crm.com / SuperAdmin123!")
    console.log("Team Admin 1: teamadmin1@medical-crm.com / TeamAdmin123!")
    console.log("Team Admin 2: teamadmin2@medical-crm.com / TeamAdmin123!")
    console.log("User 1: user1@medical-crm.com / User123!")
    console.log("User 2: user2@medical-crm.com / User123!")
    console.log("User 3: user3@medical-crm.com / User123!")
  },

  down: async (queryInterface, Sequelize) => {
    // Remove test users
    await queryInterface.bulkDelete(
      "users",
      {
        email: {
          [Sequelize.Op.in]: [
            "superadmin@medical-crm.com",
            "teamadmin1@medical-crm.com",
            "teamadmin2@medical-crm.com",
            "user1@medical-crm.com",
            "user2@medical-crm.com",
            "user3@medical-crm.com",
          ],
        },
      },
      {}
    )

    // Remove test teams (if teams table exists)
    try {
      await queryInterface.bulkDelete(
        "teams",
        {
          name: {
            [Sequelize.Op.in]: ["Sales Team Alpha", "Sales Team Beta"],
          },
        },
        {}
      )
    } catch (error) {
      console.log("Teams table does not exist, skipping team cleanup")
    }
  },
}
