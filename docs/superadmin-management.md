# SUPERADMIN Management Guide

## Overview

This document provides guidance on managing SUPERADMIN users in the IoT Pilot system. SUPERADMIN users have special privileges and require secure management procedures.

## SUPERADMIN Security Model

### Key Principles

1. **Isolation**: SUPERADMIN users exist outside the customer tenant system
2. **Protection**: Cannot be created, modified, or deleted via web APIs
3. **Console-Only**: All SUPERADMIN management via secure console commands
4. **Hidden**: Never appear in any customer admin interfaces
5. **Full Access**: Bypass all tenant restrictions for platform management

### Database Design

- **SUPERADMIN**: `customerId = NULL`, full platform access
- **CUSTOMER_ADMIN**: `customerId = required`, tenant admin scope
- **Regular Users**: `customerId = required`, tenant user scope

### Access Patterns

- **SUPERADMIN**: Cross-tenant database access, platform-wide controls
- **Customer Admins**: Tenant-scoped access, cannot see SUPERADMIN users
- **Regular Users**: Tenant-scoped access, limited permissions

### Security Enforcement

- Database constraint: `CHECK (role = 'SUPERADMIN' OR customerId IS NOT NULL)`
- API middleware: Block SUPERADMIN modification attempts
- UI filtering: Hide SUPERADMIN users from all customer interfaces
- Console-only: SUPERADMIN creation/management via secure scripts

## SUPERADMIN Management Commands

IoT Pilot provides secure console commands for managing SUPERADMIN users. These commands are only available from the command line and require direct server access.

### Creating a SUPERADMIN User

```bash
make create-superadmin
```

This interactive command will:
1. Prompt for email, username, and password
2. Validate input (email format, password strength)
3. Create a SUPERADMIN user with full system access
4. Log the operation for security audit

**Important**: Create SUPERADMIN users only when absolutely necessary. Each SUPERADMIN user has full access to all data in the system.

### Listing SUPERADMIN Users

```bash
make list-superadmins
```

This command will:
1. Display all SUPERADMIN users in the system
2. Show their ID, email, username, and creation date
3. Log the operation for security audit

### Resetting a SUPERADMIN Password

```bash
make reset-superadmin-password
```

This interactive command will:
1. List all SUPERADMIN users
2. Prompt for the ID of the SUPERADMIN user to reset
3. Require confirmation
4. Prompt for a new password with validation
5. Reset the password
6. Log the operation for security audit

### Deleting a SUPERADMIN User

```bash
make delete-superadmin
```

This interactive command will:
1. List all SUPERADMIN users
2. Prompt for the ID of the SUPERADMIN user to delete
3. Require two confirmations (including typing "DELETE")
4. Delete the SUPERADMIN user
5. Log the operation for security audit

**Warning**: Deleting a SUPERADMIN user is permanent and cannot be undone. Ensure you have at least one SUPERADMIN user remaining.

## Security Best Practices

1. **Limit SUPERADMIN Users**: Minimize the number of SUPERADMIN users to reduce attack surface
2. **Strong Passwords**: Use complex passwords (enforced by the system)
3. **Regular Audits**: Periodically review the list of SUPERADMIN users
4. **Secure Access**: Only run SUPERADMIN commands from secure, trusted environments
5. **Audit Logs**: Review SUPERADMIN operation logs regularly (stored in `logs/superadmin-operations.log`)
6. **Principle of Least Privilege**: Consider if a CUSTOMER_ADMIN role would be sufficient instead

## Troubleshooting

If you encounter issues with SUPERADMIN management:

1. Ensure you're running commands from the project root directory
2. Verify database connectivity
3. Check logs for detailed error messages
4. Ensure you have the necessary permissions to execute the commands

For additional assistance, contact the system administrator.