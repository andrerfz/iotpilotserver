#!/usr/bin/env ts-node
import {
  createInterface,
  getSuperadminUsers,
  logOperation,
  cleanup
} from './utils/superadmin-utils';

async function main() {
  console.log('=== List SUPERADMIN Users ===');
  console.log('This script will display all SUPERADMIN users in the system.');
  console.log('');

  const rl = createInterface();

  try {
    console.log('Fetching SUPERADMIN users...\n');

    // Get all SUPERADMIN users
    const superadmins = await getSuperadminUsers();

    if (superadmins.length === 0) {
      console.log('No SUPERADMIN users found.');
    } else {
      console.log(`Found ${superadmins.length} SUPERADMIN user(s):\n`);
      
      // Display each SUPERADMIN user
      superadmins.forEach((user, index) => {
        console.log(`[${index + 1}] ID: ${user.id}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Username: ${user.username}`);
        console.log(`    Created: ${user.createdAt.toISOString()}`);
        console.log(`    Last Updated: ${user.updatedAt.toISOString()}`);
        console.log('');
      });
    }

    // Log the operation
    logOperation('list-superadmins', {
      count: superadmins.length
    });

  } catch (error) {
    console.error('Error listing SUPERADMIN users:');
    console.error(error);
  } finally {
    cleanup(rl);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:');
  console.error(error);
  process.exit(1);
});