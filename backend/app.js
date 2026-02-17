require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./config/db'); // Initialize MongoDB connection
const app = express();
const userRouter = require('./routes/userRouter');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/',(req,res)=>{
    res.send('Hello World!');
})

app.use('/', userRouter)


const PORT = process.env.PORT || 8082;

app.listen(PORT);