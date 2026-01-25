import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    // Accept all files, filter will be done per endpoint
    cb(null, true);
  }
});

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, '../uploads'))) {
  fs.mkdirSync(path.join(__dirname, '../uploads'));
}

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  console.log('Photo uploaded:', req.file.filename);
  res.send({ message: 'File uploaded successfully', filename: req.file.filename });
});

app.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  console.log('Video uploaded:', req.file.filename);
  res.send({ message: 'Video uploaded successfully', filename: req.file.filename });
});

app.get('/api/uploads', (req, res) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read uploads directory' });
    }
    const images = files
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2),
          uploadedAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    res.json(images);
  });
});

app.get('/api/videos', (req, res) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read uploads directory' });
    }
    const videos = files
      .filter(file => /\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i.test(file))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          sizeMB: (stats.size / 1024 / 1024).toFixed(2),
          uploadedAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    res.json(videos);
  });
});

app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  console.log('Serving file:', filename);
  res.sendFile(path.join(__dirname, '../uploads', filename));
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});