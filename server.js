const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://admin1:admin1234@hospitalmanagement.kdn4a2u.mongodb.net/?retryWrites=true&w=majority&appName=hospitalManagement`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// Verify JWT Function
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    });
}

// Verify Admin Middleware
async function verifyAdmin(req, res, next) {
    const requester = req.decoded.email;
    const requesterAccount = await userCollection.findOne({ email: requester });
    if (requesterAccount.role === 'admin') {
        next();
    } else {
        res.status(403).send({ message: 'Forbidden' });
    }
}

// Verify Hospital Middleware
async function verifyHospital(req, res, next) {
    const requester = req.decoded.email;
    const requesterAccount = await userCollection.findOne({ email: requester });
    if (requesterAccount.role === 'hospital') {
        next();
    } else {
        res.status(403).send({ message: 'Forbidden' });
    }
}

async function run() {
    try {
        await client.connect();
        const hospitalCollection = client.db('hospital-management').collection('hospitals');
        const userCollection = client.db('hospital-management').collection('users');

        // User Routes
        app.post('/user', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.put('/user/hospital/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'hospital' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // Hospital Routes
        app.get('/hospitals', async (req, res) => {
            const query = req.query;
            let hospitals;

            if (query.popular === 'true') {
                hospitals = await hospitalCollection.find().sort({ popularity: -1 }).limit(10).toArray();
            } else {
                hospitals = await hospitalCollection.find().toArray();
            }

            // Calculate chance of getting a seat
            hospitals = hospitals.map(hospital => {
                const chanceOfGettingSeat = Math.min(100, (hospital.availableSeats / hospital.totalSeats) * 100);
                return { ...hospital, chanceOfGettingSeat: chanceOfGettingSeat.toFixed(2) + '%' };
            });

            res.send(hospitals);
        });

        app.post('/hospital', verifyJWT, verifyAdmin, async (req, res) => {
            const hospital = req.body;
            const result = await hospitalCollection.insertOne(hospital);
            res.send(result);
        });

        app.put('/hospital/:id', verifyJWT, verifyHospital, async (req, res) => {
            const id = req.params.id;
            const updatedHospital = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: updatedHospital,
            };
            const result = await hospitalCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        app.delete('/hospital/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await hospitalCollection.deleteOne(query);
            res.send(result);
        });

        // Update hospital seats
        app.patch('/hospital/seats/:id', verifyJWT, verifyHospital, async (req, res) => {
            const id = req.params.id;
            const seats = req.body.seats;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: { availableSeats: seats },
            };
            const result = await hospitalCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // Get hospitals with distance from user
        app.get('/hospitals/nearby', verifyJWT, async (req, res) => {
            const { latitude, longitude } = req.query;
            const hospitals = await hospitalCollection.find().toArray();

            const hospitalsWithDistance = hospitals.map(hospital => {
                const distance = calculateDistance(latitude, longitude, hospital.latitude, hospital.longitude);
                return { ...hospital, distance: distance.toFixed(2) + ' km' };
            });

            res.send(hospitalsWithDistance);
        });

        // JWT
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        });

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hospital Management Server is running!');
});

app.listen(port, () => {
    console.log(`Hospital Management Server is running on port ${port}`);
});