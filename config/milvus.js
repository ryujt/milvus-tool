const { MilvusClient } = require('@zilliz/milvus2-sdk-node');

let milvusClient = null;

const getMilvusClient = () => {
  if (!milvusClient) {
    const config = {
      address: `${process.env.MILVUS_HOST || 'localhost'}:${process.env.MILVUS_PORT || 19530}`,
    };

    if (process.env.MILVUS_USERNAME && process.env.MILVUS_PASSWORD) {
      config.username = process.env.MILVUS_USERNAME;
      config.password = process.env.MILVUS_PASSWORD;
    }

    milvusClient = new MilvusClient(config);
  }
  return milvusClient;
};

module.exports = { getMilvusClient };