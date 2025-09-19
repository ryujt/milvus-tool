const express = require('express');
const router = express.Router();
const { getMilvusClient } = require('../config/milvus');

// Get all collections
router.get('/', async (req, res) => {
  try {
    const client = getMilvusClient();
    const response = await client.listCollections();

    if (response.status.error_code === 'Success') {
      const collections = await Promise.all(
        response.data.map(async (name) => {
          try {
            const info = await client.describeCollection({ collection_name: name });
            const stats = await client.getCollectionStatistics({ collection_name: name });

            return {
              name,
              schema: info.schema,
              fields: info.schema.fields,
              rowCount: stats.stats?.row_count || 0,
              description: info.schema.description || '',
              createdTime: info.created_utc_timestamp,
              hasIndex: info.index ? true : false
            };
          } catch (err) {
            console.error(`Error getting info for collection ${name}:`, err);
            return { name, error: err.message };
          }
        })
      );

      res.json(collections);
    } else {
      res.status(500).json({ error: response.status.reason });
    }
  } catch (error) {
    console.error('Error listing collections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get collection details
router.get('/:name', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { name } = req.params;

    const info = await client.describeCollection({ collection_name: name });
    const stats = await client.getCollectionStatistics({ collection_name: name });
    const indexes = await client.describeIndex({ collection_name: name });

    res.json({
      name,
      schema: info.schema,
      fields: info.schema.fields,
      rowCount: stats.stats?.row_count || 0,
      description: info.schema.description || '',
      createdTime: info.created_utc_timestamp,
      indexes: indexes.index_descriptions || [],
      aliases: info.aliases || [],
      properties: info.properties || {}
    });
  } catch (error) {
    console.error('Error getting collection details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create collection
router.post('/', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { name, fields, description } = req.body;

    const schema = {
      name,
      description: description || '',
      fields: fields || [
        {
          name: 'id',
          description: 'Primary key',
          data_type: 5, // Int64
          is_primary_key: true,
          autoID: true
        },
        {
          name: 'embedding',
          description: 'Vector field',
          data_type: 101, // FloatVector
          dim: 128
        }
      ],
      enable_dynamic_field: true
    };

    const response = await client.createCollection({
      collection_name: name,
      schema
    });

    if (response.error_code === 'Success') {
      res.json({ success: true, collection: name });
    } else {
      res.status(400).json({ error: response.reason });
    }
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete collection
router.delete('/:name', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { name } = req.params;

    const response = await client.dropCollection({ collection_name: name });

    if (response.error_code === 'Success') {
      res.json({ success: true, message: `Collection ${name} deleted successfully` });
    } else {
      res.status(400).json({ error: response.reason });
    }
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Truncate collection (remove all records)
router.post('/:name/truncate', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { name } = req.params;

    // Load collection first
    await client.loadCollection({ collection_name: name });

    // Delete all entities
    const response = await client.deleteEntities({
      collection_name: name,
      expr: 'id >= 0' // This will match all records
    });

    if (response.error_code === 'Success') {
      res.json({
        success: true,
        message: `All records in collection ${name} deleted successfully`,
        deletedCount: response.delete_cnt
      });
    } else {
      res.status(400).json({ error: response.reason });
    }
  } catch (error) {
    console.error('Error truncating collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Load collection into memory
router.post('/:name/load', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { name } = req.params;

    const response = await client.loadCollection({ collection_name: name });

    if (response.error_code === 'Success') {
      res.json({ success: true, message: `Collection ${name} loaded successfully` });
    } else {
      res.status(400).json({ error: response.reason });
    }
  } catch (error) {
    console.error('Error loading collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Release collection from memory
router.post('/:name/release', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { name } = req.params;

    const response = await client.releaseCollection({ collection_name: name });

    if (response.error_code === 'Success') {
      res.json({ success: true, message: `Collection ${name} released successfully` });
    } else {
      res.status(400).json({ error: response.reason });
    }
  } catch (error) {
    console.error('Error releasing collection:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;