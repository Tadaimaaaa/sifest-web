const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetBrackets() {
  console.log("Clearing all event_brackets using Service Role Key...");
  
  const { data, error } = await supabase
    .from('event_brackets')
    .delete()
    .neq('event_slug', 'dummy')
    .select();

  if (error) {
    console.error("Error deleting brackets:", error);
  } else {
    console.log("Successfully cleared brackets. Deleted rows:", data.length);
  }
}

resetBrackets();
