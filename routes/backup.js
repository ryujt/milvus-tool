const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { getMilvusClient } = require('../config/milvus');

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

// Ensure backup directory exists
fs.ensureDirSync(BACKUP_DIR);

// Backup collection
router.post('/:collection/backup', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { collection } = req.params;

    // Get collection schema
    const info = await client.describeCollection({ collection_name: collection });

    // Load collection first
    await client.loadCollection({ collection_name: collection });

    // Query all records
    const queryResponse = await client.query({
      collection_name: collection,
      expr: 'id >= 0',
      output_fields: ['*'],
      limit: 1000000 // Large limit to get all records
    });

    if (queryResponse.status.error_code !== 'Success') {
      return res.status(400).json({ error: queryResponse.status.reason });
    }

    // Create backup files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const schemaFileName = `${timestamp}-${collection}.json`;
    const dataFileName = `${timestamp}-${collection}.jsonl`;

    const schemaPath = path.join(BACKUP_DIR, schemaFileName);
    const dataPath = path.join(BACKUP_DIR, dataFileName);

    // Save schema
    await fs.writeJson(schemaPath, {
      collection_name: collection,
      schema: info.schema,
      indexes: info.index || [],
      timestamp: new Date().toISOString()
    }, { spaces: 2 });

    // Save data as JSONL
    const dataStream = fs.createWriteStream(dataPath);
    for (const record of queryResponse.data) {
      dataStream.write(JSON.stringify(record) + '\n');
    }
    dataStream.end();

    res.json({
      success: true,
      message: `Backup created successfully`,
      files: {
        schema: schemaFileName,
        data: dataFileName
      },
      recordCount: queryResponse.data.length
    });
  } catch (error) {
    console.error('Error backing up collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restore collection
router.post('/restore', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { schemaFile, dataFile, createIfNotExists = false } = req.body;

    const schemaPath = path.join(BACKUP_DIR, schemaFile);
    const dataPath = path.join(BACKUP_DIR, dataFile);

    // Check if files exist
    if (!await fs.pathExists(schemaPath)) {
      return res.status(404).json({ error: 'Schema file not found' });
    }
    if (!await fs.pathExists(dataPath)) {
      return res.status(404).json({ error: 'Data file not found' });
    }

    // Read schema
    const schemaData = await fs.readJson(schemaPath);
    const collectionName = schemaData.collection_name;

    // Check if collection exists
    const collectionsResponse = await client.listCollections();
    const collectionExists = collectionsResponse.data.includes(collectionName);

    if (!collectionExists && createIfNotExists) {
      // Create collection with schema
      const createResponse = await client.createCollection({
        collection_name: collectionName,
        schema: schemaData.schema
      });

      if (createResponse.error_code !== 'Success') {
        return res.status(400).json({ error: createResponse.reason });
      }

      // Create indexes if they existed
      for (const index of schemaData.indexes) {
        await client.createIndex({
          collection_name: collectionName,
          field_name: index.field_name,
          index_params: index.params
        });
      }
    } else if (!collectionExists) {
      return res.status(404).json({ error: `Collection ${collectionName} does not exist` });
    }

    // Load collection
    await client.loadCollection({ collection_name: collectionName });

    // Read and insert data
    const dataContent = await fs.readFile(dataPath, 'utf-8');
    const records = dataContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    if (records.length > 0) {
      // Transform records to Milvus format
      const fields_data = [];
      const fieldNames = Object.keys(records[0]);

      fieldNames.forEach(fieldName => {
        fields_data.push({
          field_name: fieldName,
          values: records.map(record => record[fieldName])
        });
      });

      const insertResponse = await client.insert({
        collection_name: collectionName,
        fields_data
      });

      if (insertResponse.status.error_code !== 'Success') {
        return res.status(400).json({ error: insertResponse.status.reason });
      }
    }

    res.json({
      success: true,
      message: `Collection ${collectionName} restored successfully`,
      recordCount: records.length
    });
  } catch (error) {
    console.error('Error restoring collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// List available backups
router.get('/list', async (req, res) => {
  try {
    const files = await fs.readdir(BACKUP_DIR);

    const backups = {};

    for (const file of files) {
      if (file.endsWith('.json')) {
        // Schema file
        const baseName = file.replace('.json', '');
        if (!backups[baseName]) {
          backups[baseName] = { schema: null, data: null };
        }
        backups[baseName].schema = file;

        // Read schema to get metadata
        try {
          const schemaData = await fs.readJson(path.join(BACKUP_DIR, file));
          backups[baseName].collection = schemaData.collection_name;
          backups[baseName].timestamp = schemaData.timestamp;
        } catch (e) {
          console.error(`Error reading schema file ${file}:`, e);
        }
      } else if (file.endsWith('.jsonl')) {
        // Data file
        const baseName = file.replace('.jsonl', '');
        if (!backups[baseName]) {
          backups[baseName] = { schema: null, data: null };
        }
        backups[baseName].data = file;

        // Count records
        try {
          const content = await fs.readFile(path.join(BACKUP_DIR, file), 'utf-8');
          const recordCount = content.split('\n').filter(line => line.trim()).length;
          backups[baseName].recordCount = recordCount;
        } catch (e) {
          console.error(`Error reading data file ${file}:`, e);
        }
      }
    }

    // Convert to array and filter complete backups
    const backupList = Object.entries(backups)
      .filter(([_, backup]) => backup.schema && backup.data)
      .map(([name, backup]) => ({
        name,
        ...backup
      }))
      .sort((a, b) => {
        // Sort by timestamp descending
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        }
        return 0;
      });

    res.json(backupList);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
router.delete('/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;

    const schemaFile = `${backupName}.json`;
    const dataFile = `${backupName}.jsonl`;

    const schemaPath = path.join(BACKUP_DIR, schemaFile);
    const dataPath = path.join(BACKUP_DIR, dataFile);

    let deleted = false;

    if (await fs.pathExists(schemaPath)) {
      await fs.remove(schemaPath);
      deleted = true;
    }

    if (await fs.pathExists(dataPath)) {
      await fs.remove(dataPath);
      deleted = true;
    }

    if (deleted) {
      res.json({
        success: true,
        message: `Backup ${backupName} deleted successfully`
      });
    } else {
      res.status(404).json({ error: 'Backup not found' });
    }
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;