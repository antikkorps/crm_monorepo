"use strict"

/**
 * Migration to insert default reminder rules in an idempotent way.
 * These rules are considered "system defaults" and will be restored if missing.
 *
 * Default rules:
 * - Task Due Soon (3 days before)
 * - Task Overdue (1 day after)
 * - Quote Expiring Soon (7 days before)
 * - Quote Expired (7 days after)
 * - Invoice Due Soon (7 days before)
 * - Invoice Overdue (30 days after)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log("📋 Checking for system user to create default reminder rules...")

    // Find a SUPER_ADMIN user or fallback to any admin user
    const [users] = await queryInterface.sequelize.query(`
      SELECT id FROM users
      WHERE role IN ('super_admin', 'admin', 'team_admin')
      ORDER BY
        CASE role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'team_admin' THEN 3
          ELSE 4
        END
      LIMIT 1
    `)

    if (!users || users.length === 0) {
      console.warn(
        "⚠️  No admin user found. Skipping default reminder rules insertion."
      )
      console.warn("    Run this migration again after creating an admin user.")
      return
    }

    const systemUserId = users[0].id
    console.log(`✓ Found system user: ${systemUserId}`)

    // Fixed UUIDs for system default rules (for idempotency)
    const DEFAULT_RULES = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        entity_type: "task",
        trigger_type: "due_soon",
        days_before: 3,
        days_after: 0,
        priority: "medium",
        title_template: "Task Due Soon",
        message_template: "Task '{title}' is due in {days} days.",
        action_url_template: "/tasks/{id}",
        action_text_template: "View Task",
        auto_create_task: false,
        task_priority: "medium",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        entity_type: "task",
        trigger_type: "overdue",
        days_before: 0,
        days_after: 1,
        priority: "high",
        title_template: "Task Overdue",
        message_template: "Task '{title}' is {days} days overdue.",
        action_url_template: "/tasks/{id}",
        action_text_template: "View Task",
        auto_create_task: false,
        task_priority: "high",
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        entity_type: "quote",
        trigger_type: "due_soon",
        days_before: 7,
        days_after: 0,
        priority: "low",
        title_template: "Quote Expiring Soon",
        message_template:
          "Quote '{quoteNumber}' for {institutionName} expires in {days} days.",
        action_url_template: "/quotes/{id}",
        action_text_template: "View Quote",
        auto_create_task: false,
        task_priority: "low",
      },
      {
        id: "00000000-0000-0000-0000-000000000004",
        entity_type: "quote",
        trigger_type: "expired",
        days_before: 0,
        days_after: 7,
        priority: "medium",
        title_template: "Quote Expired",
        message_template:
          "Quote '{quoteNumber}' for {institutionName} expired {days} days ago.",
        action_url_template: "/quotes/{id}",
        action_text_template: "View Quote",
        auto_create_task: true,
        task_title_template: "Follow up on expired quote {quoteNumber}",
        task_priority: "medium",
      },
      {
        id: "00000000-0000-0000-0000-000000000005",
        entity_type: "invoice",
        trigger_type: "due_soon",
        days_before: 7,
        days_after: 0,
        priority: "medium",
        title_template: "Invoice Due Soon",
        message_template: "Invoice '{invoiceNumber}' for {amount}€ is due in {days} days.",
        action_url_template: "/invoices/{id}",
        action_text_template: "View Invoice",
        auto_create_task: false,
        task_priority: "medium",
      },
      {
        id: "00000000-0000-0000-0000-000000000006",
        entity_type: "invoice",
        trigger_type: "unpaid",
        days_before: 0,
        days_after: 30,
        priority: "high",
        title_template: "Invoice Overdue",
        message_template: "Invoice '{invoiceNumber}' for {amount}€ is {days} days overdue.",
        action_url_template: "/invoices/{id}",
        action_text_template: "View Invoice",
        auto_create_task: true,
        task_title_template: "Follow up on unpaid invoice {invoiceNumber}",
        task_priority: "high",
      },
    ]

    console.log(`📝 Inserting ${DEFAULT_RULES.length} default reminder rules...`)

    let insertedCount = 0
    let skippedCount = 0

    for (const rule of DEFAULT_RULES) {
      // Check if this rule already exists (by UUID)
      const [existingRules] = await queryInterface.sequelize.query(
        `SELECT id FROM reminder_rules WHERE id = :id`,
        {
          replacements: { id: rule.id },
        }
      )

      if (existingRules && existingRules.length > 0) {
        console.log(
          `  ⏭️  Skipping ${rule.entity_type}/${rule.trigger_type} (already exists)`
        )
        skippedCount++
        continue
      }

      // Insert the rule
      await queryInterface.bulkInsert("reminder_rules", [
        {
          id: rule.id,
          entity_type: rule.entity_type,
          trigger_type: rule.trigger_type,
          days_before: rule.days_before,
          days_after: rule.days_after,
          priority: rule.priority,
          is_active: true,
          title_template: rule.title_template,
          message_template: rule.message_template,
          action_url_template: rule.action_url_template,
          action_text_template: rule.action_text_template,
          auto_create_task: rule.auto_create_task,
          task_title_template: rule.task_title_template || null,
          task_priority: rule.task_priority,
          team_id: null, // System-wide rules
          created_by: systemUserId,
          updated_by: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])

      console.log(`  ✓ Inserted ${rule.entity_type}/${rule.trigger_type}`)
      insertedCount++
    }

    console.log(`✅ Migration complete: ${insertedCount} inserted, ${skippedCount} skipped`)
  },

  down: async (queryInterface, Sequelize) => {
    console.log("🗑️  Removing default reminder rules...")

    // Delete only the system default rules (by their fixed UUIDs)
    const systemRuleIds = [
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
      "00000000-0000-0000-0000-000000000003",
      "00000000-0000-0000-0000-000000000004",
      "00000000-0000-0000-0000-000000000005",
      "00000000-0000-0000-0000-000000000006",
    ]

    await queryInterface.bulkDelete("reminder_rules", {
      id: systemRuleIds,
    })

    console.log("✓ Default reminder rules removed")
  },
}
