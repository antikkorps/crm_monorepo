"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create users table
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM("super_admin", "team_admin", "user"),
        allowNull: false,
        defaultValue: "user",
      },
      avatar_seed: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      team_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Create teams table
    await queryInterface.createTable("teams", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Add foreign key constraint for users.team_id
    await queryInterface.addConstraint("users", {
      fields: ["team_id"],
      type: "foreign key",
      name: "users_team_id_fkey",
      references: {
        table: "teams",
        field: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    })

    // Create medical_institutions table
    await queryInterface.createTable("medical_institutions", {
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
        type: Sequelize.ENUM("hospital", "clinic", "laboratory", "pharmacy", "other"),
        allowNull: false,
      },
      address: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "US",
        },
      },
      assigned_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Create medical_profiles table
    await queryInterface.createTable("medical_profiles", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      institution_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "medical_institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      bed_capacity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      surgical_rooms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      specialties: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      departments: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      equipment_types: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      certifications: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      compliance_status: {
        type: Sequelize.ENUM("compliant", "non_compliant", "pending_review", "expired"),
        allowNull: false,
        defaultValue: "pending_review",
      },
      last_audit_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      compliance_expiration_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      compliance_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Create contact_persons table
    await queryInterface.createTable("contact_persons", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      institution_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "medical_institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      department: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Create tasks table
    await queryInterface.createTable("tasks", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("todo", "in_progress", "review", "done", "cancelled"),
        allowNull: false,
        defaultValue: "todo",
      },
      priority: {
        type: Sequelize.ENUM("low", "medium", "high", "urgent"),
        allowNull: false,
        defaultValue: "medium",
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      institution_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "medical_institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Create quotes table
    await queryInterface.createTable("quotes", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      quote_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      institution_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "medical_institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM("draft", "sent", "accepted", "rejected", "expired"),
        allowNull: false,
        defaultValue: "draft",
      },
      valid_until: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Create quote_items table
    await queryInterface.createTable("quote_items", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      quote_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "quotes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Create invoices table
    await queryInterface.createTable("invoices", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      invoice_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      quote_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "quotes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      institution_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "medical_institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM("draft", "sent", "paid", "overdue", "cancelled"),
        allowNull: false,
        defaultValue: "draft",
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      paid_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Create invoice_items table
    await queryInterface.createTable("invoice_items", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      invoice_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "invoices",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Create payments table
    await queryInterface.createTable("payments", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      invoice_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "invoices",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.ENUM("cash", "check", "bank_transfer", "credit_card", "other"),
        allowNull: false,
      },
      payment_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      reference_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      notes: {
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
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // Add indexes for better performance
    await queryInterface.addIndex("users", ["email"], { unique: true })
    await queryInterface.addIndex("users", ["role"])
    await queryInterface.addIndex("users", ["team_id"])
    await queryInterface.addIndex("users", ["is_active"])

    await queryInterface.addIndex("teams", ["name"], { unique: true })
    await queryInterface.addIndex("teams", ["is_active"])

    await queryInterface.addIndex("medical_institutions", ["name"])
    await queryInterface.addIndex("medical_institutions", ["type"])
    await queryInterface.addIndex("medical_institutions", ["assigned_user_id"])
    await queryInterface.addIndex("medical_institutions", ["is_active"])

    await queryInterface.addIndex("medical_profiles", ["institution_id"], {
      unique: true,
    })
    await queryInterface.addIndex("medical_profiles", ["compliance_status"])

    await queryInterface.addIndex("contact_persons", ["institution_id"])
    await queryInterface.addIndex("contact_persons", ["email"])
    await queryInterface.addIndex("contact_persons", ["is_primary"])

    await queryInterface.addIndex("tasks", ["assigned_to"])
    await queryInterface.addIndex("tasks", ["created_by"])
    await queryInterface.addIndex("tasks", ["institution_id"])
    await queryInterface.addIndex("tasks", ["status"])
    await queryInterface.addIndex("tasks", ["priority"])
    await queryInterface.addIndex("tasks", ["due_date"])

    await queryInterface.addIndex("quotes", ["quote_number"], { unique: true })
    await queryInterface.addIndex("quotes", ["institution_id"])
    await queryInterface.addIndex("quotes", ["created_by"])
    await queryInterface.addIndex("quotes", ["status"])
    await queryInterface.addIndex("quotes", ["valid_until"])

    await queryInterface.addIndex("quote_items", ["quote_id"])

    await queryInterface.addIndex("invoices", ["invoice_number"], { unique: true })
    await queryInterface.addIndex("invoices", ["quote_id"])
    await queryInterface.addIndex("invoices", ["institution_id"])
    await queryInterface.addIndex("invoices", ["created_by"])
    await queryInterface.addIndex("invoices", ["status"])
    await queryInterface.addIndex("invoices", ["due_date"])

    await queryInterface.addIndex("invoice_items", ["invoice_id"])

    await queryInterface.addIndex("payments", ["invoice_id"])
    await queryInterface.addIndex("payments", ["payment_date"])
    await queryInterface.addIndex("payments", ["created_by"])
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order to avoid foreign key constraints
    await queryInterface.dropTable("payments")
    await queryInterface.dropTable("invoice_items")
    await queryInterface.dropTable("invoices")
    await queryInterface.dropTable("quote_items")
    await queryInterface.dropTable("quotes")
    await queryInterface.dropTable("tasks")
    await queryInterface.dropTable("contact_persons")
    await queryInterface.dropTable("medical_profiles")
    await queryInterface.dropTable("medical_institutions")
    await queryInterface.dropTable("users")
    await queryInterface.dropTable("teams")

    // Drop enums
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";')
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_medical_institutions_type";'
    )
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_medical_profiles_compliance_status";'
    )
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tasks_status";')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tasks_priority";')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_quotes_status";')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_invoices_status";')
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_payments_payment_method";'
    )
  },
}
