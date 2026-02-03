#!/usr/bin/env node

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'slam25',
  user: process.env.DB_USER || 'slam_user',
  password: process.env.DB_PASSWORD || 'password'
});

async function updateParticipants() {
  const client = await pool.connect();
  
  try {
    console.log('Starting participant updates...');
    
    const updates = [
  {
    "id": 1131,
    "name": "Almtuh Nitsch",
    "updates": [
      {
        "field": "pronouns",
        "oldValue": "",
        "newValue": "sie/ihr"
      }
    ]
  },
  {
    "id": 1144,
    "name": "Arne Poek",
    "updates": [
      {
        "field": "pronouns",
        "oldValue": "er/ihm",
        "newValue": "Er/ihm"
      }
    ]
  },
  {
    "id": 1148,
    "name": "Bernard Hofmeister",
    "updates": [
      {
        "field": "pronouns",
        "oldValue": "er/ihm",
        "newValue": "Er/ihm"
      }
    ]
  },
  {
    "id": 1150,
    "name": "Bisan Badawi",
    "updates": [
      {
        "field": "pronouns",
        "oldValue": "",
        "newValue": "Sie/Ihr"
      }
    ]
  }
];
    
    for (const update of updates) {
      console.log(`Updating ${update.name} (ID: ${update.id})...`);
      
      for (const fieldUpdate of update.updates) {
        const query = `UPDATE participants SET ${fieldUpdate.field} = $1 WHERE id = $2`;
        const result = await client.query(query, [fieldUpdate.newValue, update.id]);
        
        console.log(`  ✓ Updated ${fieldUpdate.field}: "${fieldUpdate.oldValue}" → "${fieldUpdate.newValue}"`);
      }
    }
    
    console.log('\nAll updates completed successfully!');
    
  } catch (error) {
    console.error('Error updating participants:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updateParticipants();
