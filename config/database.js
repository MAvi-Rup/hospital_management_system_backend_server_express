const { MongoClient } = require('mongodb');

const uri = `mongodb+srv://admin1:admin1234@hospitalmanagement.kdn4a2u.mongodb.net/?retryWrites=true&w=majority&appName=hospitalManagement`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = client;