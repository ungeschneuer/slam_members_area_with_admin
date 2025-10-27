#!/bin/bash

# Schema Comparison Script
# Compares development and production database schemas

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DEV_SCHEMA="dev_schema.sql"
PROD_SCHEMA="prod_schema.sql"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if schema files exist
if [ ! -f "$DEV_SCHEMA" ]; then
    log_error "Development schema file not found: $DEV_SCHEMA"
    exit 1
fi

if [ ! -f "$PROD_SCHEMA" ]; then
    log_error "Production schema file not found: $PROD_SCHEMA"
    exit 1
fi

log_info "🔍 Comparing database schemas..."

# Extract table definitions
extract_tables() {
    local schema_file="$1"
    local output_file="$2"
    
    # Extract CREATE TABLE statements
    grep -E "^CREATE TABLE" "$schema_file" | sed 's/CREATE TABLE //' | sed 's/ (.*//' | sort > "$output_file"
}

# Extract column definitions
extract_columns() {
    local schema_file="$1"
    local table_name="$2"
    local output_file="$3"
    
    # Extract column definitions for a specific table
    awk "/CREATE TABLE $table_name \(/,/\);/" "$schema_file" | \
    grep -E "^\s+[a-zA-Z_][a-zA-Z0-9_]*" | \
    sed 's/^\s*//' | \
    sed 's/,$//' | \
    sort > "$output_file"
}

# Extract indexes
extract_indexes() {
    local schema_file="$1"
    local output_file="$2"
    
    # Extract CREATE INDEX statements
    grep -E "^CREATE.*INDEX" "$schema_file" | sort > "$output_file"
}

# Extract constraints
extract_constraints() {
    local schema_file="$1"
    local output_file="$2"
    
    # Extract constraint definitions
    grep -E "(CONSTRAINT|PRIMARY KEY|FOREIGN KEY|UNIQUE)" "$schema_file" | sort > "$output_file"
}

# Create temporary files
DEV_TABLES="dev_tables.tmp"
PROD_TABLES="prod_tables.tmp"
DEV_INDEXES="dev_indexes.tmp"
PROD_INDEXES="prod_indexes.tmp"
DEV_CONSTRAINTS="dev_constraints.tmp"
PROD_CONSTRAINTS="prod_constraints.tmp"

# Extract table information
log_info "📋 Extracting table information..."
extract_tables "$DEV_SCHEMA" "$DEV_TABLES"
extract_tables "$PROD_SCHEMA" "$PROD_TABLES"

# Extract index information
log_info "📋 Extracting index information..."
extract_indexes "$DEV_SCHEMA" "$DEV_INDEXES"
extract_indexes "$PROD_SCHEMA" "$PROD_INDEXES"

# Extract constraint information
log_info "📋 Extracting constraint information..."
extract_constraints "$DEV_SCHEMA" "$DEV_CONSTRAINTS"
extract_constraints "$PROD_SCHEMA" "$PROD_CONSTRAINTS"

# Compare tables
log_info "🔍 Comparing tables..."
echo ""
echo "=== TABLE COMPARISON ==="

# Tables in dev but not in prod
MISSING_IN_PROD=$(comm -23 "$DEV_TABLES" "$PROD_TABLES")
if [ -n "$MISSING_IN_PROD" ]; then
    log_warning "⚠️  Tables in DEV but missing in PROD:"
    echo "$MISSING_IN_PROD" | while read table; do
        echo "   - $table"
    done
    echo ""
fi

# Tables in prod but not in dev
MISSING_IN_DEV=$(comm -13 "$DEV_TABLES" "$PROD_TABLES")
if [ -n "$MISSING_IN_DEV" ]; then
    log_warning "⚠️  Tables in PROD but missing in DEV:"
    echo "$MISSING_IN_DEV" | while read table; do
        echo "   - $table"
    done
    echo ""
fi

# Common tables
COMMON_TABLES=$(comm -12 "$DEV_TABLES" "$PROD_TABLES")
if [ -n "$COMMON_TABLES" ]; then
    log_info "📋 Common tables (checking for column differences):"
    echo "$COMMON_TABLES" | while read table; do
        echo "   - $table"
        
        # Extract columns for this table
        DEV_COLS="dev_${table}_cols.tmp"
        PROD_COLS="prod_${table}_cols.tmp"
        
        extract_columns "$DEV_SCHEMA" "$table" "$DEV_COLS"
        extract_columns "$PROD_SCHEMA" "$table" "$PROD_COLS"
        
        # Compare columns
        MISSING_COLS_IN_PROD=$(comm -23 "$DEV_COLS" "$PROD_COLS" 2>/dev/null || true)
        MISSING_COLS_IN_DEV=$(comm -13 "$DEV_COLS" "$PROD_COLS" 2>/dev/null || true)
        
        if [ -n "$MISSING_COLS_IN_PROD" ]; then
            log_warning "     Columns in DEV but missing in PROD:"
            echo "$MISSING_COLS_IN_PROD" | while read col; do
                echo "       - $col"
            done
        fi
        
        if [ -n "$MISSING_COLS_IN_DEV" ]; then
            log_warning "     Columns in PROD but missing in DEV:"
            echo "$MISSING_COLS_IN_DEV" | while read col; do
                echo "       - $col"
            done
        fi
        
        # Clean up column files
        rm -f "$DEV_COLS" "$PROD_COLS"
    done
    echo ""
fi

# Compare indexes
log_info "🔍 Comparing indexes..."
echo ""
echo "=== INDEX COMPARISON ==="

MISSING_INDEXES_IN_PROD=$(comm -23 "$DEV_INDEXES" "$PROD_INDEXES")
if [ -n "$MISSING_INDEXES_IN_PROD" ]; then
    log_warning "⚠️  Indexes in DEV but missing in PROD:"
    echo "$MISSING_INDEXES_IN_PROD" | while read index; do
        echo "   - $index"
    done
    echo ""
fi

MISSING_INDEXES_IN_DEV=$(comm -13 "$DEV_INDEXES" "$PROD_INDEXES")
if [ -n "$MISSING_INDEXES_IN_DEV" ]; then
    log_warning "⚠️  Indexes in PROD but missing in DEV:"
    echo "$MISSING_INDEXES_IN_DEV" | while read index; do
        echo "   - $index"
    done
    echo ""
fi

# Compare constraints
log_info "🔍 Comparing constraints..."
echo ""
echo "=== CONSTRAINT COMPARISON ==="

MISSING_CONSTRAINTS_IN_PROD=$(comm -23 "$DEV_CONSTRAINTS" "$PROD_CONSTRAINTS")
if [ -n "$MISSING_CONSTRAINTS_IN_PROD" ]; then
    log_warning "⚠️  Constraints in DEV but missing in PROD:"
    echo "$MISSING_CONSTRAINTS_IN_PROD" | while read constraint; do
        echo "   - $constraint"
    done
    echo ""
fi

MISSING_CONSTRAINTS_IN_DEV=$(comm -13 "$DEV_CONSTRAINTS" "$PROD_CONSTRAINTS")
if [ -n "$MISSING_CONSTRAINTS_IN_DEV" ]; then
    log_warning "⚠️  Constraints in PROD but missing in DEV:"
    echo "$MISSING_CONSTRAINTS_IN_DEV" | while read constraint; do
        echo "   - $constraint"
    done
    echo ""
fi

# Generate migration script for missing elements
log_info "🔧 Generating migration script for missing elements..."

MIGRATION_FILE="fix_schema_mismatches.sql"
cat > "$MIGRATION_FILE" << 'EOF'
-- Migration: Fix schema mismatches between dev and prod
-- Date: $(date +"%Y-%m-%d %H:%M:%S")
-- Description: Add missing tables, columns, indexes, and constraints to production

BEGIN;

EOF

# Add missing tables
if [ -n "$MISSING_IN_PROD" ]; then
    echo "-- Missing tables in production" >> "$MIGRATION_FILE"
    echo "$MISSING_IN_PROD" | while read table; do
        echo "-- TODO: Add table $table" >> "$MIGRATION_FILE"
        # Extract full table definition from dev schema
        awk "/CREATE TABLE $table \(/,/\);/" "$DEV_SCHEMA" >> "$MIGRATION_FILE"
        echo "" >> "$MIGRATION_FILE"
    done
fi

# Add missing columns
if [ -n "$COMMON_TABLES" ]; then
    echo "-- Missing columns in production tables" >> "$MIGRATION_FILE"
    echo "$COMMON_TABLES" | while read table; do
        DEV_COLS="dev_${table}_cols.tmp"
        PROD_COLS="prod_${table}_cols.tmp"
        
        extract_columns "$DEV_SCHEMA" "$table" "$DEV_COLS"
        extract_columns "$PROD_SCHEMA" "$table" "$PROD_COLS"
        
        MISSING_COLS_IN_PROD=$(comm -23 "$DEV_COLS" "$PROD_COLS" 2>/dev/null || true)
        
        if [ -n "$MISSING_COLS_IN_PROD" ]; then
            echo "-- Missing columns in table $table" >> "$MIGRATION_FILE"
            echo "$MISSING_COLS_IN_PROD" | while read col; do
                # Extract column definition from dev schema
                COL_DEF=$(awk "/CREATE TABLE $table \(/,/\);/" "$DEV_SCHEMA" | grep -E "^\s*$col" | head -1)
                if [ -n "$COL_DEF" ]; then
                    echo "ALTER TABLE $table ADD COLUMN $COL_DEF;" >> "$MIGRATION_FILE"
                fi
            done
            echo "" >> "$MIGRATION_FILE"
        fi
        
        rm -f "$DEV_COLS" "$PROD_COLS"
    done
fi

# Add missing indexes
if [ -n "$MISSING_INDEXES_IN_PROD" ]; then
    echo "-- Missing indexes in production" >> "$MIGRATION_FILE"
    echo "$MISSING_INDEXES_IN_PROD" | while read index; do
        echo "$index;" >> "$MIGRATION_FILE"
    done
    echo "" >> "$MIGRATION_FILE"
fi

# Add missing constraints
if [ -n "$MISSING_CONSTRAINTS_IN_PROD" ]; then
    echo "-- Missing constraints in production" >> "$MIGRATION_FILE"
    echo "$MISSING_CONSTRAINTS_IN_PROD" | while read constraint; do
        echo "-- TODO: Add constraint: $constraint" >> "$MIGRATION_FILE"
    done
    echo "" >> "$MIGRATION_FILE"
fi

echo "COMMIT;" >> "$MIGRATION_FILE"

log_success "✅ Migration script generated: $MIGRATION_FILE"

# Clean up temporary files
rm -f "$DEV_TABLES" "$PROD_TABLES" "$DEV_INDEXES" "$PROD_INDEXES" "$DEV_CONSTRAINTS" "$PROD_CONSTRAINTS"

log_info "📊 Schema comparison completed!"
log_info "📄 Review the generated migration script: $MIGRATION_FILE"
log_info "🔧 Apply the migration to production after review"
