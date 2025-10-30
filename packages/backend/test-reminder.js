const { ReminderService } = require('./src/services/ReminderService');
const { User } = require('./src/models');

async function testReminderSystem() {
  try {
    console.log('🧪 Testing reminder system...');
    
    // Get admin user
    const adminUser = await User.findOne({
      where: { email: 'admin@medical-crm.com' }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Found admin user:', adminUser.id);
    
    // Create default rules
    const service = ReminderService.getInstance();
    await service.createDefaultRules(adminUser.id);
    console.log('✅ Default reminder rules created successfully');
    
    // Test processing
    await service.processAllReminders();
    console.log('✅ Reminder processing test completed');
    
    console.log('🎉 Reminder system is working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testReminderSystem().then(() => process.exit(0));