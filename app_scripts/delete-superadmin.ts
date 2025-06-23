#!/usr/bin/env ts-node
import * as zod from 'zod';
import {
  createInterface,
  askQuestion,
  askConfirmation,
  getSuperadminUsers,
  deleteSuperadminUser,
  logOperation,
  cleanup
} from './utils/superadmin-utils';

async function main() {
  console.log('=== Delete SUPERADMIN User ===');
  console.log('WARNING: This script will permanently delete a SUPERADMIN user.');
  console.log('This action cannot be undone and may impact system access.');
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
    const userId = await askQuestion(rl, 'Enter the ID of the SUPERADMIN user to delete: ');
    
    // Find the user
    const user = superadmins.find(u => u.id === userId);
    if (!user) {
      console.error('User not found. Please check the ID and try again.');
      return;
    }

    // First confirmation
    const confirmed = await askConfirmation(rl, `Are you sure you want to delete ${user.email}?`);
    if (!confirmed) {
      console.log('Operation cancelled.');
      return;
    }

    // Second confirmation - type DELETE
    console.log('\nThis is a destructive operation that cannot be undone.');
    const confirmText = await askQuestion(rl, 'Type "DELETE" to confirm: ');
    if (confirmText !== 'DELETE') {
      console.log('Operation cancelled. Confirmation text did not match "DELETE".');
      return;
    }

    console.log('\nDeleting SUPERADMIN user...');

    // Delete the user
    await deleteSuperadminUser(userId);

    console.log('\nSUPERADMIN user deleted successfully.');

    // Log the operation
    logOperation('delete-superadmin', {
      userId: user.id,
      email: user.email,
      username: user.username
    });

  } catch (error) {
    console.error('Error deleting SUPERADMIN user:');
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