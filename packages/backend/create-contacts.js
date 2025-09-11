const { DatabaseSeeder } = require('./dist/utils/seeder');

async function createContacts() {
  try {
    console.log('Creating demo contacts...');
    await DatabaseSeeder.seedContactPersons();
    console.log('Demo contacts created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating contacts:', error);
    process.exit(1);
  }
}

createContacts();