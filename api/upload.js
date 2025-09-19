import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import nc from 'next-connect';
import path from 'path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const upload = multer({ storage: multer.memoryStorage() });

function generateFilename(originalname) {
  const bulan = new Date().toLocaleString('id-ID', { month: 'long' });
  const tahun = new Date().getFullYear();
  const ext = path.extname(originalname);
  return `${bulan}_${tahun}${ext}`;
}

const handler = nc()
  .use(upload.single('file'))
  .post(async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, msg: 'No file uploaded' });

      alert('Env:', process.env.SUPABASE_URL, process.env.SUPABASE_KEY, process.env.SUPABASE_BUCKET);
      alert('File info:', req.file);

      const filename = generateFilename(req.file.originalname);

      const { error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .getPublicUrl(filename);

      res.json({ success: true, filename, url: publicUrl.publicUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, msg: err.message });
    }
  });

export default handler;

export const config = {
  api: {
    bodyParser: false,
  },
};
