import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ success: false, msg: 'Method not allowed' });

  const { name } = req.query;
  if (!name) return res.status(400).json({ success: false, msg: 'Missing file name' });

  const { error } = await supabase.storage.from(process.env.SUPABASE_BUCKET).remove([name]);

  if (error) return res.status(500).json({ success: false, msg: error.message });

  res.json({ success: true, msg: `File ${name} deleted` });
}
