import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // multer handles parsing
  },
};

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const upload = multer({ storage: multer.memoryStorage() });

function generateFilename(originalname) {
  const bulan = new Date().toLocaleString('id-ID', { month: 'long' });
  const tahun = new Date().getFullYear();
  const ext = path.extname(originalname);
  return `${bulan}_${tahun}${ext}`;
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, msg: 'Method not allowed' });

  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(500).json({ success: false, msg: err.message });
    if (!req.file) return res.status(400).json({ success: false, msg: 'No file uploaded' });

    const filename = generateFilename(req.file.originalname);

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (error) return res.status(500).json({ success: false, msg: error.message });

    const { data: publicUrl } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(filename);

    res.json({ success: true, filename, url: publicUrl.publicUrl });
  });
}
