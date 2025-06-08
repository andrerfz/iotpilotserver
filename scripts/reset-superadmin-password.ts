#!/usr/bin/env ts-node
import * as zod from 'zod';
import {
  createInterface,
  validateInput,
  askQuestion,
  askConfirmation,
  getSuperadminUsers,
  resetSuperadminPassword,
  passwordSchema,
  logOperation,
  cleanup
} from './utils/superadmin-utils';

async function main() {
  console.log('=== Reset SUPERADMIN Password ===');
  console.log('This script will reset the password for an existing SUPERADMIN user.');
  console.log('');

  const rl = createInterface();

  try {
    console.log('Fetching SUPERADMIN users...\n');

    // Get all SUPERADMIN users
    const superadmins = await getSuperadminUsers();

    if (superadmins.length === 0) {
      console.log('No SUPERADMIN users found.');
      return;
    }

    // Display each SUPERADMIN user
    console.log('Available SUPERADMIN users:');
    superadmins.forEach((user, index) => {
      console.log(`[${index + 1}] ID: ${user.id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Username: ${user.username}`);
      console.log('');
    });

    // Ask for user ID
    const userId = await askQuestion(rl, 'Enter the ID of the SUPERADMIN user to reset password: ');
    
    // Find the user
    const user = superadmins.find(u => u.id === userId);
    if (!user) {
      console.error('User not found. Please check the ID and try again.');
      return;
    }

    // Confirm reset
    const confirmed = await askConfirmation(rl, `Are you sure you want to reset the password for ${user.email}?`);
    if (!confirmed) {
      console.log('Operation cancelled.');
      return;
    }

    // Get new password
    const password = await validateInput(rl, 'Enter new password: ', passwordSchema, true);
    const confirmPassword = await validateInput(rl, 'Confirm new password: ', zod.string(), true);

    // Check if passwords match
    if (password !== confirmPassword) {
      console.error('Passwords do not match. Please try again.');
      return;
    }

    console.log('\nResetting password...');

    // Reset the password
    await resetSuperadminPassword(userId, password);

    console.log('\nPassword reset successfully.');

    // Log the operation (excluding password)
    logOperation('reset-superadmin-password', {
      userId: user.id,
      email: user.email,
      username: user.username
    });

  } catch (error) {
    console.error('Error resetting SUPERADMIN password:');
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