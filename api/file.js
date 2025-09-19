import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, msg: 'Method not allowed' });

  const { name } = req.query;
  if (!name) return res.status(400).json({ success: false, msg: 'Missing file name' });

  // gunakan publicUrl supaya frontend bisa langsung fetch
  const { data: publicUrl } = supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(name);

  res.json({ success: true, name, url: publicUrl.publicUrl });
}
