require('dotenv').config({path: '.env.local'});
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('events').select('*').then(res => console.log(JSON.stringify(res.data, null, 2)));
