const express = require('express');
const router = express.Router();
const { getMilvusClient } = require('../config/milvus');

// Search/Query records with pagination
router.post('/:collection/search', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { collection } = req.params;
    const {
      page = 1,
      limit = 20,
      filter = '',
      outputFields = ['*'],
      vector = null,
      topK = null
    } = req.body;

    // Load collection first
    await client.loadCollection({ collection_name: collection });

    const offset = (page - 1) * limit;

    // If vector search is requested
    if (vector && topK) {
      const searchParams = {
        collection_name: collection,
        vectors: [vector],
        search_params: {
          anns_field: 'embedding',
          topk: topK,
          metric_type: 'L2',
          params: JSON.stringify({ nprobe: 10 })
        },
        output_fields: outputFields,
        vector_type: 101 // FloatVector
      };

      if (filter) {
        searchParams.expr = filter;
      }

      const response = await client.search(searchParams);

      if (response.status.error_code === 'Success') {
        res.json({
          success: true,
          data: response.results,
          page,
          limit,
          total: response.results.length
        });
      } else {
        res.status(400).json({ error: response.status.reason });
      }
    } else {
      // Regular query without vector search
      const queryParams = {
        collection_name: collection,
        expr: filter || 'id >= 0',
        output_fields: outputFields,
        offset,
        limit
      };

      const response = await client.query(queryParams);

      if (response.status.error_code === 'Success') {
        // Get total count
        const countResponse = await client.query({
          collection_name: collection,
          expr: filter || 'id >= 0',
          output_fields: ['count(*)']
        });

        const total = countResponse.data?.[0]?.['count(*)'] || response.data.length;

        res.json({
          success: true,
          data: response.data,
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        });
      } else {
        res.status(400).json({ error: response.status.reason });
      }
    }
  } catch (error) {
    console.error('Error searching records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single record by ID
router.get('/:collection/:id', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { collection, id } = req.params;

    // Load collection first
    await client.loadCollection({ collection_name: collection });

    const response = await client.query({
      collection_name: collection,
      expr: `id == ${id}`,
      output_fields: ['*']
    });

    if (response.status.error_code === 'Success') {
      if (response.data.length > 0) {
        res.json({
          success: true,
          data: response.data[0]
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    } else {
      res.status(400).json({ error: response.status.reason });
    }
  } catch (error) {
    console.error('Error getting record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Insert records
router.post('/:collection', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { collection } = req.params;
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Records must be an array' });
    }

    // Load collection first
    await client.loadCollection({ collection_name: collection });

    // Transform records to Milvus format
    const fields_data = [];
    const fieldNames = Object.keys(records[0]);

    fieldNames.forEach(fieldName => {
      fields_data.push({
        field_name: fieldName,
        values: records.map(record => record[fieldName])
      });
    });

    const response = await client.insert({
      collection_name: collection,
      fields_data
    });

    if (response.status.error_code === 'Success') {
      res.json({
        success: true,
        insertedCount: response.succ_index.length,
        ids: response.IDs
      });
    } else {
      res.status(400).json({ error: response.status.reason });
    }
  } catch (error) {
    console.error('Error inserting records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update record (delete and re-insert)
router.put('/:collection/:id', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { collection, id } = req.params;
    const { record } = req.body;

    if (!record) {
      return res.status(400).json({ error: 'Record data is required' });
    }

    // Load collection first
    await client.loadCollection({ collection_name: collection });

    // Delete existing record
    const deleteResponse = await client.deleteEntities({
      collection_name: collection,
      expr: `id == ${id}`
    });

    if (deleteResponse.error_code !== 'Success') {
      return res.status(400).json({ error: deleteResponse.reason });
    }

    // Insert updated record
    const fields_data = Object.entries(record).map(([field_name, value]) => ({
      field_name,
      values: [value]
    }));

    const insertResponse = await client.insert({
      collection_name: collection,
      fields_data
    });

    if (insertResponse.status.error_code === 'Success') {
      res.json({
        success: true,
        message: 'Record updated successfully',
        id: insertResponse.IDs?.[0] || id
      });
    } else {
      res.status(400).json({ error: insertResponse.status.reason });
    }
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete record
router.delete('/:collection/:id', async (req, res) => {
  try {
    const client = getMilvusClient();
    const { collection, id } = req.params;

    // Load collection first
    await client.loadCollection({ collection_name: collection });

    const response = await client.deleteEntities({
      collection_name: collection,
      expr: `id == ${id}`
    });

    if (response.error_code === 'Success') {
      res.json({
        success: true,
        message: 'Record deleted successfully',
        deletedCount: response.delete_cnt
      });
    } else {
      res.status(400).json({ error: response.reason });
    }
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;