require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('../config/db');
const { syncMunicipalitiesFromCsv } = require('../utils/municipalitySync');

async function run() {
  const { upserts } = await syncMunicipalitiesFromCsv();

  console.log(`Municipality import complete. Upserted rows: ${upserts}`);
}

run()
  .catch((err) => {
    console.error('Municipality import failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
