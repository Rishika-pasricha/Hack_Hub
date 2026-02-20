require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('./config/db'); // Initialize MongoDB connection
const { syncMunicipalitiesFromCsv } = require('./utils/municipalitySync');
const app = express();
const userRouter = require('./routes/userRouter');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/',(req,res)=>{
    res.send('Hello World!');
})

app.use('/', userRouter)

mongoose.connection.once('open', async () => {
    try {
        const { upserts } = await syncMunicipalitiesFromCsv();
        console.log(`Municipality sync complete on startup. Upserted rows: ${upserts}`);
    } catch (err) {
        console.error('Municipality sync failed on startup:', err.message);
    }
});

const PORT = process.env.PORT || 8082;

app.listen(PORT);
