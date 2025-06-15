import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import * as zod from 'zod';

// Create a Prisma client instance
const prisma = new PrismaClient();

// Create a readline interface for interactive prompts
export function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Validation schemas
export const emailSchema = zod.string().email('Invalid email format');
export const usernameSchema = zod.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters');
export const passwordSchema = zod.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

// Ask a question and return the answer
export async function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Ask for confirmation (yes/no)
export async function askConfirmation(rl: readline.Interface, question: string): Promise<boolean> {
  const answer = await askQuestion(rl, `${question} (y/n): `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

// Ask for a password (hidden input)
export async function askPassword(rl: readline.Interface, question: string): Promise<string> {
  // Note: In a real implementation, we would use a package like 'readline-sync' to hide the password
  // For simplicity, we'll just use regular readline here
  return askQuestion(rl, question);
}

// Validate input against a schema
export async function validateInput<T>(
  rl: readline.Interface, 
  question: string, 
  schema: zod.ZodType<T>,
  hidden: boolean = false
): Promise<T> {
  while (true) {
    const input = hidden ? await askPassword(rl, question) : await askQuestion(rl, question);
    
    try {
      return schema.parse(input) as T;
    } catch (error) {
      if (error instanceof zod.ZodError) {
        console.error(`Validation error: ${error.errors[0].message}`);
      } else {
        console.error('Invalid input. Please try again.');
      }
    }
  }
}

// Log operations to a file
export function logOperation(operation: string, details: Record<string, any>) {
  const logDir = path.join(__dirname, '../../logs');
  const logFile = path.join(logDir, 'superadmin-operations.log');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    operation,
    ...details
  };
  
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  
  console.log(`Operation logged to ${logFile}`);
}

// Get all SUPERADMIN users
export async function getSuperadminUsers() {
  return prisma.user.findMany({
    where: {
      role: UserRole.SUPERADMIN,
      customerId: null
    },
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
}

// Create a SUPERADMIN user
export async function createSuperadminUser(email: string, username: string, password: string) {
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // Create the user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`
    }
  });
  
  return user;
}

// Reset a SUPERADMIN user's password
export async function resetSuperadminPassword(userId: string, newPassword: string) {
  // Hash the password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  // Update the user
  const user = await prisma.user.update({
    where: {
      id: userId,
      role: UserRole.SUPERADMIN,
      customerId: null
    },
    data: {
      password: hashedPassword
    }
  });
  
  return user;
}

// Delete a SUPERADMIN user
export async function deleteSuperadminUser(userId: string) {
  // Delete the user
  const user = await prisma.user.delete({
    where: {
      id: userId,
      role: UserRole.SUPERADMIN,
      customerId: null
    }
  });
  
  return user;
}

// Close resources
export function cleanup(rl: readline.Interface) {
  rl.close();
  prisma.$disconnect();
}