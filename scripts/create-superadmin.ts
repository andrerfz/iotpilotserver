#!/usr/bin/env ts-node
import * as zod from 'zod';
import {
  createInterface,
  validateInput,
  emailSchema,
  usernameSchema,
  passwordSchema,
  createSuperadminUser,
  logOperation,
  cleanup
} from './utils/superadmin-utils';

async function main() {
  console.log('=== Create SUPERADMIN User ===');
  console.log('This script will create a new SUPERADMIN user with full system access.');
  console.log('SUPERADMIN users have access to all tenants and can manage the entire system.');
  console.log('Use this script with caution and only create SUPERADMIN users when necessary.');
  console.log('');

  const rl = createInterface();

  try {
    // Get user input with validation
    const email = await validateInput(rl, 'Enter email: ', emailSchema);
    const username = await validateInput(rl, 'Enter username: ', usernameSchema);
    const password = await validateInput(rl, 'Enter password: ', passwordSchema, true);
    const confirmPassword = await validateInput(rl, 'Confirm password: ', zod.string(), true);

    // Check if passwords match
    if (password !== confirmPassword) {
      console.error('Passwords do not match. Please try again.');
      return;
    }

    console.log('\nCreating SUPERADMIN user...');

    // Create the user
    const user = await createSuperadminUser(email, username, password);

    console.log('\nSUPERADMIN user created successfully:');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Username: ${user.username}`);
    console.log(`Role: ${user.role}`);

    // Log the operation (excluding password)
    logOperation('create-superadmin', {
      userId: user.id,
      email: user.email,
      username: user.username
    });

  } catch (error) {
    console.error('Error creating SUPERADMIN user:');
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
