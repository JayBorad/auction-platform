const { seedSystemSettings } = require("../src/db/seed-system-settings");

async function main() {
  console.log('Seeding system settings...');
  const result = await seedSystemSettings();
  
  if (result.success) {
    console.log('✅', result.message);
  } else {
    console.error('❌', result.message);
    process.exit(1);
  }
}

main().catch(console.error);
