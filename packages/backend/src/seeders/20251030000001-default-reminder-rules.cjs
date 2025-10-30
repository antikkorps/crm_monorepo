"use strict"

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { User } = require("../models/index")
    const { ReminderRule } = require("../models/index")

    try {
      // Find admin user
      const adminUser = await User.findOne({
        where: { email: "admin@medical-crm.com" },
      })

      if (!adminUser) {
        console.warn("Admin user not found, skipping reminder rules creation")
        return
      }

      const defaultRules = [
        // Task reminders
        {
          entityType: "task",
          triggerType: "due_soon",
          daysBefore: 7,
          daysAfter: 0,
          priority: "medium",
          isActive: true,
          titleTemplate: "Task Due Soon",
          messageTemplate: 'Task "{title}" is due in {days} day(s)',
          actionUrlTemplate: "/tasks/{id}",
          actionTextTemplate: "View Task",
          autoCreateTask: true,
          taskTitleTemplate: 'Follow up on task: "{title}"',
          taskPriority: "medium",
          createdBy: adminUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          entityType: "task",
          triggerType: "overdue",
          daysBefore: 0,
          daysAfter: 1,
          priority: "high",
          isActive: true,
          titleTemplate: "Task Overdue",
          messageTemplate: 'Task "{title}" is {days} day(s) overdue',
          actionUrlTemplate: "/tasks/{id}",
          actionTextTemplate: "View Task",
          autoCreateTask: true,
          taskTitleTemplate: 'Urgent: Overdue task "{title}"',
          taskPriority: "high",
          createdBy: adminUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Quote reminders
        {
          entityType: "quote",
          triggerType: "expired",
          daysBefore: 0,
          daysAfter: 7,
          priority: "medium",
          isActive: true,
          titleTemplate: "Quote Expired",
          messageTemplate: 'Quote "{title}" expired {days} day(s) ago',
          actionUrlTemplate: "/quotes/{id}",
          actionTextTemplate: "View Quote",
          autoCreateTask: true,
          taskTitleTemplate: 'Follow up on expired quote "{title}"',
          taskPriority: "medium",
          createdBy: adminUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          entityType: "quote",
          triggerType: "due_soon",
          daysBefore: 7,
          daysAfter: 0,
          priority: "low",
          isActive: true,
          titleTemplate: "Quote Expiring Soon",
          messageTemplate: 'Quote "{title}" expires in {days} day(s)',
          actionUrlTemplate: "/quotes/{id}",
          actionTextTemplate: "View Quote",
          autoCreateTask: false,
          taskTitleTemplate: 'Check quote "{title}" status',
          taskPriority: "low",
          createdBy: adminUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Invoice reminders
        {
          entityType: "invoice",
          triggerType: "unpaid",
          daysBefore: 0,
          daysAfter: 30,
          priority: "high",
          isActive: true,
          titleTemplate: "Invoice Overdue",
          messageTemplate: 'Invoice "{title}" is {days} day(s) overdue',
          actionUrlTemplate: "/invoices/{id}",
          actionTextTemplate: "View Invoice",
          autoCreateTask: true,
          taskTitleTemplate: 'Follow up on unpaid invoice "{title}"',
          taskPriority: "high",
          createdBy: adminUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          entityType: "invoice",
          triggerType: "due_soon",
          daysBefore: 7,
          daysAfter: 0,
          priority: "medium",
          isActive: true,
          titleTemplate: "Invoice Due Soon",
          messageTemplate: 'Invoice "{title}" is due in {days} day(s)',
          actionUrlTemplate: "/invoices/{id}",
          actionTextTemplate: "View Invoice",
          autoCreateTask: false,
          taskTitleTemplate: 'Check invoice "{title}" payment status',
          taskPriority: "medium",
          createdBy: adminUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      await queryInterface.bulkInsert("reminder_rules", defaultRules)
      console.log(`Created ${defaultRules.length} default reminder rules`)
    } catch (error) {
      console.error("Error creating default reminder rules:", error)
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("reminder_rules", null, {})
  },
}