// Collections page JavaScript
let collections = [];
let selectedCollection = null;

// Load collections on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCollections();
    setupEventListeners();
});

function setupEventListeners() {
    // Delete modal
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }

    // Truncate modal
    const confirmTruncateBtn = document.getElementById('confirm-truncate');
    if (confirmTruncateBtn) {
        confirmTruncateBtn.addEventListener('click', confirmTruncate);
    }
}

async function loadCollections() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('collections-container');
    const errorContainer = document.getElementById('error-container');

    loading.style.display = 'block';
    container.style.display = 'none';
    errorContainer.style.display = 'none';

    try {
        collections = await api.collections.list();
        renderCollections();
        loading.style.display = 'none';
        container.style.display = 'block';
    } catch (error) {
        console.error('Error loading collections:', error);
        loading.style.display = 'none';
        errorContainer.style.display = 'block';
        let errorMessage = error.message;
        let suggestions = '';

        if (error.message.includes('UNAVAILABLE') || error.message.includes('connection')) {
            suggestions = `
                <br><br><strong>To start Milvus locally:</strong>
                <br>1. Make sure Docker is running
                <br>2. In the project directory, run: <code>docker-compose up -d</code>
                <br>3. Wait about 30 seconds for Milvus to start
                <br>4. Refresh this page
            `;
        }

        errorContainer.innerHTML = `
            <strong>Error loading collections:</strong> ${errorMessage}
            <br>Make sure Milvus is running and accessible.
            ${suggestions}
        `;
    }
}

function renderCollections() {
    const tbody = document.getElementById('collections-list');

    if (collections.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    No collections found.
                    <a href="/pages/create-collection.html">Create your first collection</a>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = collections.map(collection => `
        <tr>
            <td>
                <strong>${collection.name}</strong>
                ${collection.error ? `<br><small class="text-danger">${collection.error}</small>` : ''}
            </td>
            <td>${collection.description || '<em>No description</em>'}</td>
            <td>${collection.rowCount ? formatNumber(collection.rowCount) : '0'}</td>
            <td>
                ${collection.fields ? collection.fields.map(field =>
                    `<span class="field-badge">${field.name}</span>`
                ).join('') : 'N/A'}
            </td>
            <td>
                ${collection.hasIndex
                    ? '<span class="badge bg-success">Yes</span>'
                    : '<span class="badge bg-secondary">No</span>'}
            </td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-info" onclick="viewDetails('${collection.name}')" title="View Details">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="searchRecords('${collection.name}')" title="Search Records">
                    <i class="bi bi-search"></i>
                </button>
                <button class="btn btn-sm btn-success" onclick="backupCollection('${collection.name}')" title="Backup">
                    <i class="bi bi-download"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="showTruncateModal('${collection.name}')" title="Truncate">
                    <i class="bi bi-eraser"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="showDeleteModal('${collection.name}')" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function viewDetails(collectionName) {
    window.location.href = `/pages/collection-details.html?collection=${encodeURIComponent(collectionName)}`;
}

function searchRecords(collectionName) {
    window.location.href = `/pages/search-records.html?collection=${encodeURIComponent(collectionName)}`;
}

async function backupCollection(collectionName) {
    try {
        const result = await api.backup.create(collectionName);
        if (result.success) {
            showSuccess(`Backup created successfully: ${result.recordCount} records saved`);
        } else {
            showError(result.error || 'Backup failed');
        }
    } catch (error) {
        showError(`Backup failed: ${error.message}`);
    }
}

function showDeleteModal(collectionName) {
    selectedCollection = collectionName;
    document.getElementById('delete-collection-name').textContent = collectionName;
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

function showTruncateModal(collectionName) {
    selectedCollection = collectionName;
    document.getElementById('truncate-collection-name').textContent = collectionName;
    const modal = new bootstrap.Modal(document.getElementById('truncateModal'));
    modal.show();
}

async function confirmDelete() {
    if (!selectedCollection) return;

    try {
        const result = await api.collections.delete(selectedCollection);
        if (result.success) {
            showSuccess(`Collection "${selectedCollection}" deleted successfully`);
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            modal.hide();
            loadCollections();
        } else {
            showError(result.error || 'Delete failed');
        }
    } catch (error) {
        showError(`Delete failed: ${error.message}`);
    }
}

async function confirmTruncate() {
    if (!selectedCollection) return;

    try {
        const result = await api.collections.truncate(selectedCollection);
        if (result.success) {
            showSuccess(`Collection "${selectedCollection}" truncated successfully`);
            const modal = bootstrap.Modal.getInstance(document.getElementById('truncateModal'));
            modal.hide();
            loadCollections();
        } else {
            showError(result.error || 'Truncate failed');
        }
    } catch (error) {
        showError(`Truncate failed: ${error.message}`);
    }
}