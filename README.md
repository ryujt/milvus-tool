# Milvus Manager

A web-based management tool for Milvus vector database with Express backend and HTML/Bootstrap frontend.

## Features

- **Collection Management**: View, create, delete, and truncate collections
- **Collection Details**: View schema, fields, indexes, and statistics
- **Record Search**: Search and browse records with pagination
- **Record Editing**: Edit and delete individual records
- **Backup/Restore**: Create backups in JSONL format and restore them
- **Schema Builder**: Visual interface for creating collections with custom schemas

## Prerequisites

- Node.js 18+ and npm
- Milvus instance running (local or remote)
- Docker and Docker Compose (for local Milvus setup)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ryujt/milvus-tool.git
cd milvus-tool
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` file to match your Milvus configuration:
```env
# Milvus Configuration
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_USERNAME=
MILVUS_PASSWORD=

# Server Configuration
PORT=3000
NODE_ENV=development

# Backup Configuration
BACKUP_DIR=./backups
```

## Running Milvus Locally (Optional)

If you don't have a Milvus instance, you can run one locally using Docker Compose:

```bash
# Start Milvus (includes etcd, MinIO, and Milvus standalone)
docker-compose up -d

# Check status - wait for all services to be healthy
docker-compose ps

# View logs if needed
docker-compose logs milvus-standalone

# Stop Milvus
docker-compose down
```

**Note**: This will start Milvus v2.5.4 with the following services:
- **Milvus Standalone**: Main vector database service (port 19530)
- **etcd**: Metadata storage (v3.5.16)
- **MinIO**: Object storage for vector data (ports 9000, 9001)

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage

### Home Page - Collections List
- View all collections with their statistics
- Quick actions: View details, search records, backup, truncate, delete

### Create Collection
- Define collection name and description
- Add custom fields with different data types
- Support for vector fields with dimensions
- Enable dynamic fields option

### Collection Details
- View complete schema information
- See field definitions and data types
- Check indexes and their configurations
- Perform collection operations (load, release, backup, delete)

### Search Records
- Filter records using expressions (e.g., `id > 100 AND id < 200`)
- Paginated results with configurable page size
- Edit records inline
- Delete individual records

### Backup/Restore
- Create backups of collections (schema + data)
- Backups stored as JSONL files with timestamps
- Restore backups to same or different collections
- Option to create collection if it doesn't exist during restore

## API Endpoints

### Collections
- `GET /api/collections` - List all collections
- `GET /api/collections/:name` - Get collection details
- `POST /api/collections` - Create new collection
- `DELETE /api/collections/:name` - Delete collection
- `POST /api/collections/:name/truncate` - Remove all records
- `POST /api/collections/:name/load` - Load collection to memory
- `POST /api/collections/:name/release` - Release from memory

### Records
- `POST /api/records/:collection/search` - Search records with pagination
- `GET /api/records/:collection/:id` - Get single record
- `POST /api/records/:collection` - Insert records
- `PUT /api/records/:collection/:id` - Update record
- `DELETE /api/records/:collection/:id` - Delete record

### Backup
- `GET /api/backup/list` - List available backups
- `POST /api/backup/:collection/backup` - Create backup
- `POST /api/backup/restore` - Restore from backup
- `DELETE /api/backup/:backupName` - Delete backup

## Architecture

```
milvus-tool/
├── server.js              # Express server setup
├── config/
│   └── milvus.js         # Milvus client configuration
├── routes/
│   ├── collections.js    # Collection endpoints
│   ├── records.js        # Record CRUD operations
│   └── backup.js         # Backup/restore endpoints
├── public/
│   ├── index.html        # Home page (collections list)
│   ├── pages/
│   │   ├── collection-details.html
│   │   ├── create-collection.html
│   │   ├── backup-restore.html
│   │   └── search-records.html
│   ├── js/
│   │   ├── api.js        # API helper functions
│   │   └── collections.js # Collections page logic
│   └── css/
│       └── style.css     # Custom styles
└── backups/              # Backup files directory
```

## Version Information

- **Milvus**: v2.5.4 (Docker image)
- **Milvus SDK**: v2.6.0 (@zilliz/milvus2-sdk-node)
- **etcd**: v3.5.16
- **MinIO**: RELEASE.2023-03-20T20-16-18Z
- **Express**: v5.1.0
- **Node.js**: 18+ required

## Data Types Supported

- **Scalar Types**: Bool, Int8, Int16, Int32, Int64, Float, Double, VarChar, JSON
- **Vector Types**: FloatVector, BinaryVector

## Troubleshooting

### Cannot connect to Milvus
- Check if Milvus is running: `docker-compose ps`
- Verify all services are healthy (may take 1-2 minutes to start)
- Check Milvus logs: `docker-compose logs milvus-standalone`
- Ensure port 19530 is not blocked by firewall

### Port conflicts
- **Port 3000**: Change PORT in `.env` if already in use
- **Port 19530**: Milvus main port - stop other Milvus instances
- **Port 9000/9001**: MinIO ports - stop other MinIO instances

### Backup/Restore issues
- Ensure the `BACKUP_DIR` exists and is writable
- Check that backup files are in the correct format
- Verify collection schema compatibility

### Docker issues
- Make sure Docker is running
- Check available disk space for volumes
- Run `docker-compose down && docker-compose up -d` to restart

## Health Checks

The application includes built-in health monitoring:
- **Application**: `http://localhost:3000/api/health`
- **Milvus**: Health check included in Docker Compose
- **Dependencies**: etcd and MinIO health checks included

## License

ISC

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.