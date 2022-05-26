const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zxlt1.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// verifyJWT
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            console.log(err)
            return res.status(403).send({ message: 'forbidden access' })

        }
        req.decoded = decoded;
        next();
    });
}



async function run() {
    try {
        await client.connect();
        console.log('db connected');
        const productCollection = client.db('Cakeries_bd').collection('products');
        const orderCollection = client.db('Cakeries_bd').collection('orders');
        const userCollection = client.db('Cakeries_bd').collection('users');

        // To load product in home page
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });
        // after clicking purchase btn route to shop and showing details
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })
        // To post clients order in mongodb
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result)
        })

        //  update stock after any order 
        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    stock: updatedProduct.stock
                }
            };
            const result = await productCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
        //  To show users previous order on dashboard
        app.get('/orders', verifyJWT, async (req, res) => {
            const customer = req.query.customerName;
            const query = { customer: customer };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        })


        //  app.get('/orders', verifyJWT, async (req, res) => {
        //      const customerEmail = req.query.customerEmail;
        //      const decodedEmail = req.decoded.email;
        //      if (decodedEmail === decodedEmail) {
        //          const query = { customerEmail : customerEmail };
        //          const orders = await orderCollection.find(query).toArray();
        //          return res.send(orders);
        //      }
        //      else {
        //          return res.status(403).send({ message: 'forbidden access' });
        //      }
        //  })


        // admin setup start => User update after signup in database

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, token });
        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

    }
    finally {

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Running Cakeries server');
});

app.listen(port, () => {
    console.log('Listening to Cakeries server', port);
})
