const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalFile: { type: String, required: true },
    translatedFile: { type: String },
    fromLanguage: { type: String, required: true },
    toLanguage: { type: String, required: true },
    tat: { type: String, required: true },
    status: { type: String, enum: ['Uploaded', 'In Progress', 'Completed'], default: 'Uploaded' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('File', fileSchema);
