import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .list();

    if (error) return res.status(500).json({ success: false, msg: error.message });

    const files = data.map(f => f.name);
    res.status(200).json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
}
