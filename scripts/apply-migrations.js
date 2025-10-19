const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(migrationFile) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log(`Applying migration: ${migrationFile}`);
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        const { error } = await supabase.rpc('sql', { query: statement + ';' });
        if (error) {
          console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
          console.error(error);
        }
      } catch (err) {
        console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
        console.error(err);
      }
    }
  }
  
  console.log(`✅ Migration ${migrationFile} completed`);
}

async function checkTables() {
  console.log('Checking current database state...');
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
    
  if (error) {
    console.error('Error checking tables:', error);
  } else {
    console.log('Current tables:', data?.map(t => t.table_name) || []);
  }
}

async function main() {
  try {
    await checkTables();
    
    // Apply migrations in order
    const migrations = [
      '001_initial_schema.sql',
      '002_org_credentials.sql'
    ];
    
    for (const migration of migrations) {
      await applyMigration(migration);
    }
    
    // Apply RLS policies
    const policiesPath = path.join(__dirname, '..', 'supabase', 'policies', '002_rls_policies.sql');
    if (fs.existsSync(policiesPath)) {
      console.log('Applying RLS policies...');
      const policiesSql = fs.readFileSync(policiesPath, 'utf8');
      const statements = policiesSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error } = await supabase.rpc('sql', { query: statement + ';' });
            if (error) {
              console.error(`Error executing policy: ${statement.substring(0, 100)}...`);
              console.error(error);
            }
          } catch (err) {
            console.error(`Error executing policy: ${statement.substring(0, 100)}...`);
            console.error(err);
          }
        }
      }
      console.log('✅ RLS policies applied');
    }
    
    await checkTables();
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('Failed to apply migrations:', error);
    process.exit(1);
  }
}

main();