import { sequelize } from './src/config/database'
import { User, ReminderRule } from './src/models'
import { ReminderService } from './src/services/ReminderService'

async function testReminderSystem() {
  try {
    console.log('🚀 Testing Reminder System...')
    
    // Connect to database
    await sequelize.authenticate()
    console.log('✅ Database connected successfully')
    
    // Find admin user
    const adminUser = await User.findOne({
      where: { email: 'admin@medical-crm.com' }
    })
    
    if (!adminUser) {
      console.error('❌ Admin user not found')
      return
    }
    
    console.log(`✅ Found admin user: ${adminUser.email}`)
    
    // Check if reminder rules exist
    const existingRules = await ReminderRule.findAll()
    console.log(`✅ Found ${existingRules.length} existing reminder rules`)
    
    if (existingRules.length === 0) {
      console.log('📝 Creating default reminder rules...')
      await ReminderService.createDefaultRules(adminUser.id)
      const newRules = await ReminderRule.findAll()
      console.log(`✅ Created ${newRules.length} default reminder rules`)
    }
    
    // Test processing reminders
    console.log('⚡ Processing reminders...')
    const results = await ReminderService.processAllReminders()
    
    console.log('📊 Results:')
    console.log(`- Tasks processed: ${results.tasksProcessed}`)
    console.log(`- Quotes processed: ${results.quotesProcessed}`)
    console.log(`- Invoices processed: ${results.invoicesProcessed}`)
    console.log(`- Notifications sent: ${results.notificationsSent}`)
    console.log(`- Tasks created: ${results.tasksCreated}`)
    console.log(`- Errors: ${results.errors.length}`)
    
    if (results.errors.length > 0) {
      console.log('❌ Errors:')
      results.errors.forEach(error => console.log(`  - ${error}`))
    }
    
    console.log('✅ Reminder system test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing reminder system:', error)
  } finally {
    await sequelize.close()
  }
}

testReminderSystem()