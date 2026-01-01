"use strict"

const bcrypt = require("bcryptjs")
const { v4: uuidv4 } = require("uuid")

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Seed teams (check if they exist first)
    const teamId = uuidv4()
    const existingTeams = await queryInterface.sequelize.query(
      "SELECT id FROM teams WHERE name = ?",
      {
        replacements: ["Medical Sales Team"],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    )

    let actualTeamId = teamId
    if (existingTeams.length === 0) {
      await queryInterface.bulkInsert("teams", [
        {
          id: teamId,
          name: "Medical Sales Team",
          description: "Default team for medical institution sales representatives",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
    } else {
      actualTeamId = existingTeams[0].id
    }

    // Seed users
    const adminId = uuidv4()
    const salesRepId = uuidv4()

    await queryInterface.bulkInsert("users", [
      {
        id: adminId,
        email: "admin-demo@medical-crm.com",
        password_hash: await bcrypt.hash("admin123", 10),
        first_name: "Admin",
        last_name: "User",
        role: "super_admin",
        avatar_seed: "admin-user",
        is_active: true,
        team_id: actualTeamId,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: salesRepId,
        email: "sales-demo@medical-crm.com",
        password_hash: await bcrypt.hash("demo123", 10),
        first_name: "Demo",
        last_name: "Sales Rep",
        role: "user",
        avatar_seed: "demo-sales",
        is_active: true,
        team_id: actualTeamId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    // Seed medical institutions
    const hospitalId = uuidv4()
    const clinicId = uuidv4()

    await queryInterface.bulkInsert("medical_institutions", [
      {
        id: hospitalId,
        name: "General Hospital",
        type: "hospital",
        address: JSON.stringify({
          street: "123 Medical Center Dr",
          city: "New York",
          state: "NY",
          zipCode: "10001",
          country: "US",
        }),
        assigned_user_id: salesRepId,
        tags: ["major_hospital", "teaching_hospital"],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: clinicId,
        name: "City Medical Clinic",
        type: "clinic",
        address: JSON.stringify({
          street: "456 Health St",
          city: "Los Angeles",
          state: "CA",
          zipCode: "90210",
          country: "US",
        }),
        assigned_user_id: salesRepId,
        tags: ["outpatient_clinic"],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    // Seed medical profiles
    await queryInterface.bulkInsert("medical_profiles", [
      {
        id: uuidv4(),
        institution_id: hospitalId,
        bed_capacity: 250,
        surgical_rooms: 12,
        specialties: ["cardiology", "neurology", "oncology"],
        departments: ["emergency", "surgery", "pediatrics"],
        equipment_types: ["mri", "ct_scan", "ultrasound"],
        certifications: ["joint_commission", "iso_9001"],
        compliance_status: "compliant",
        last_audit_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        compliance_expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        compliance_notes: "All certifications up to date",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        institution_id: clinicId,
        bed_capacity: 20,
        surgical_rooms: 2,
        specialties: ["family_medicine", "internal_medicine"],
        departments: ["outpatient", "lab"],
        equipment_types: ["x_ray", "ultrasound"],
        certifications: ["clia"],
        compliance_status: "compliant",
        last_audit_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        compliance_expiration_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
        compliance_notes: "CLIA certification current",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    // Seed contact persons
    await queryInterface.bulkInsert("contact_persons", [
      {
        id: uuidv4(),
        institution_id: hospitalId,
        first_name: "Dr. Sarah",
        last_name: "Johnson",
        email: "s.johnson@generalhospital.com",
        phone: "(555) 123-4567",
        title: "Chief Medical Officer",
        department: "Administration",
        is_primary: true,
        is_active: true,
        data_source: "crm",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        institution_id: clinicId,
        first_name: "Dr. Michael",
        last_name: "Chen",
        email: "m.chen@citymedical.com",
        phone: "(555) 987-6543",
        title: "Medical Director",
        department: "Clinical",
        is_primary: true,
        is_active: true,
        data_source: "crm",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("contact_persons", null, {})
    await queryInterface.bulkDelete("medical_profiles", null, {})
    await queryInterface.bulkDelete("medical_institutions", null, {})
    await queryInterface.bulkDelete("users", null, {})
    await queryInterface.bulkDelete("teams", null, {})
  },
}
