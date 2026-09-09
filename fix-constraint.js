const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixConstraint() {
  // Drop the constraint on registrations
  const { error: err1 } = await supabaseAdmin.rpc('exec_sql', { 
    sql: 'ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;'
  });
  
  if (err1) {
    console.log("RPC exec_sql might not exist, let's just create a raw query via postgres or ignore if we can't.");
    console.log(err1);
  } else {
    console.log("Constraint dropped successfully via RPC!");
  }
}

fixConstraint();
