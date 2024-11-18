const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const File = require('../models/File');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config()

const router = express.Router();

// Admin Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, role: 'admin' });
        if (!user) return res.status(404).json({ error: 'Admin not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, 'SECRET_KEY', { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Fetch all files
router.get('/files', async (req, res) => {
    try {
        const files = await File.find().populate('uploadedBy', 'email').setOptions({ strictPopulate: false });; // Assuming `uploadedBy` references the client
        res.status(200).json(files);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch files' });
    }
});

// Download file
router.get('/download/:id', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.resolve(__dirname, '../', file.originalFile); // Construct absolute path
        res.setHeader('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ error: 'Error downloading file' });
            }
        });
    } catch (error) {
        console.error('Error in download API:', error); // Log unexpected errors
        res.status(500).json({ error: 'Error downloading file' });
    }
});

router.get('/download-translated-file/:id', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.resolve(__dirname, '../', file.translatedFile); // Construct absolute path
        res.setHeader('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ error: 'Error downloading file' });
            }
        });
    } catch (error) {
        console.error('Error in download API:', error); // Log unexpected errors
        res.status(500).json({ error: 'Error downloading file' });
    }
});

// Upload translated file
router.post('/upload/:id', auth, async (req, res) => {
    const file = req.file; // Use Multer middleware
    res.json({ message: 'File uploaded' });
});

// Send email
router.post('/email/:id', auth, async (req, res) => {
    res.json({ message: 'Email sent' });
});

router.post('/upload-translated-file/:fileId', upload.single('file'), async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findById(fileId);
        if (!file) return res.status(404).json({ message: 'File not found' });

        file.translatedFile = req.file.path; // Save file path or URL
        file.status = 'Completed'; // Update status
        await file.save();

        res.status(200).json({ message: 'File uploaded successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to upload file' });
    }
});

router.post('/send-email/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findById(fileId).populate('uploadedBy', 'email');
        console.log('file', file);

        // Ensure the file and translatedFilePath are available
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (!file.translatedFile) {
            return res.status(400).json({ message: 'Translated file path is missing' });
        }

        console.log('File Path:', file.translatedFile);

        // Check if the file exists
        if (!fs.existsSync(file.translatedFile)) {
            return res.status(400).json({ message: 'Translated file does not exist at the specified path' });
        }

        const image = fs.readFileSync(file.translatedFile).toString('base64');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: file.uploadedBy.email,
            subject: 'Translated File',
            text: 'Here is your translated file.',
            html: `<p>Here is your translated file:</p>`,
            attachments: [
                {
                    filename: 'sample.jpg',
                    content: image,
                    encoding: 'base64',
                    contentType: 'image/jpeg',  // Ensure correct MIME type
                },
            ],
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to send email' });
    }
});



module.exports = router;
