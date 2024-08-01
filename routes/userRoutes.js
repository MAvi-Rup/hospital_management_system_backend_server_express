const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyJWT = require('../middleware/verifyJWT');
const verifyAdmin = require('../middleware/verifyAdmin');

router.post('/', userController.createUser);
router.get('/', verifyJWT, userController.getAllUsers);
router.put('/admin/:email', verifyJWT, verifyAdmin, userController.makeAdmin);
router.put('/hospital/:email', verifyJWT, verifyAdmin, userController.makeHospital);

module.exports = router;