#!/bin/bash

# Add node_modules/.bin to PATH so we can use prisma and other tools
export PATH="/app/node_modules/.bin:$PATH"

echo "🚀 Starting IoT Pilot..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until pg_isready -h postgres -p 5432 -U "$POSTGRES_USER" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Set up password for all DB operations
export PGPASSWORD="$POSTGRES_PASSWORD"

# Function to check if database has tables
has_tables() {
    local table_count=$(psql -h postgres -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    [[ "$table_count" -gt 0 ]]
}

# Function to check if Prisma migrations table exists
has_prisma_migrations() {
    psql -h postgres -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations');" 2>/dev/null | grep -q 't'
}

# Function to apply initial SQL migration
apply_initial_migration() {
    echo "📝 Applying initial SQL migration..."
    if psql -h postgres -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f prisma/migration/001_initial_setup.sql; then
        echo "✅ Initial SQL migration applied successfully"

        # Create Prisma migration structure
        echo "📝 Setting up Prisma migration tracking..."
        mkdir -p prisma/migrations/20240101000000_initial_setup
        cp prisma/migration/001_initial_setup.sql prisma/migrations/20240101000000_initial_setup/migration.sql

        # Initialize Prisma migrations table manually if needed
        if ! has_prisma_migrations; then
            echo "🔧 Initializing Prisma migrations table..."
            npm run db:migrate:resolve 20240101000000_initial_setup 2>/dev/null || echo "⚠️ Could not initialize Prisma tracking"
        fi

        return 0
    else
        echo "❌ Initial SQL migration failed"
        return 1
    fi
}

# Main migration logic
if has_tables; then
    echo "🗄️ Database has existing tables"

    # Check if we have Prisma migrations to run
    if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
        echo "🔄 Running Prisma migrations (for updates)..."
        if npm run db:migrate:deploy; then
            echo "✅ Prisma migrations completed"
        else
            echo "⚠️ Some migrations failed, but continuing with existing schema"
        fi
    else
        echo "📋 No additional Prisma migrations found"
    fi

elif [ -f "prisma/migration/001_initial_setup.sql" ]; then
    echo "🆕 Empty database detected, applying initial setup..."
    if ! apply_initial_migration; then
        exit 1
    fi

else
    echo "🔧 No initial migration found, using Prisma schema push..."
    if npm run db:push; then
        echo "✅ Database schema pushed successfully"
    else
        echo "❌ Database schema push failed"
        exit 1
    fi
fi

# Always try to run any pending Prisma migrations for updates
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "🔄 Checking for pending Prisma migrations..."
    if npm run db:migrate:deploy 2>/dev/null; then
        echo "✅ All migrations are up to date"
    else
        echo "⚠️ Migration check completed with warnings"
    fi
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
if npm run db:generate; then
    echo "✅ Prisma client generated"
else
    echo "⚠️ Prisma client generation failed, continuing anyway"
fi

# Final verification
if has_tables; then
    echo "✅ Database verification passed"
else
    echo "❌ Database verification failed - no tables found"
    exit 1
fi

echo "🎉 Starting the application..."
exec node server.cjs