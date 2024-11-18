const express = require('express');
const multer = require('multer');
const File = require('../models/File');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        const { fromLanguage, toLanguage, tat } = req.body;
        const newFile = new File({
            clientId: req.user.id,
            uploadedBy: req.user.id,
            originalFile: req.file.path,
            fromLanguage,
            toLanguage,
            tat,
        });

        await newFile.save();
        res.status(201).json({ message: 'File uploaded successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/files', auth, async (req, res) => {
    try {
        const files = await File.find({ clientId: req.user.id });
        res.json(files);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
