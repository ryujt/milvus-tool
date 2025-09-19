// API helper functions
const API_BASE = '/api';

const api = {
    // Collections API
    collections: {
        list: async () => {
            const response = await fetch(`${API_BASE}/collections`);
            return response.json();
        },
        get: async (name) => {
            const response = await fetch(`${API_BASE}/collections/${name}`);
            return response.json();
        },
        create: async (data) => {
            const response = await fetch(`${API_BASE}/collections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },
        delete: async (name) => {
            const response = await fetch(`${API_BASE}/collections/${name}`, {
                method: 'DELETE'
            });
            return response.json();
        },
        truncate: async (name) => {
            const response = await fetch(`${API_BASE}/collections/${name}/truncate`, {
                method: 'POST'
            });
            return response.json();
        },
        load: async (name) => {
            const response = await fetch(`${API_BASE}/collections/${name}/load`, {
                method: 'POST'
            });
            return response.json();
        },
        release: async (name) => {
            const response = await fetch(`${API_BASE}/collections/${name}/release`, {
                method: 'POST'
            });
            return response.json();
        }
    },

    // Records API
    records: {
        search: async (collection, params) => {
            const response = await fetch(`${API_BASE}/records/${collection}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            return response.json();
        },
        get: async (collection, id) => {
            const response = await fetch(`${API_BASE}/records/${collection}/${id}`);
            return response.json();
        },
        insert: async (collection, records) => {
            const response = await fetch(`${API_BASE}/records/${collection}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ records })
            });
            return response.json();
        },
        update: async (collection, id, record) => {
            const response = await fetch(`${API_BASE}/records/${collection}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record })
            });
            return response.json();
        },
        delete: async (collection, id) => {
            const response = await fetch(`${API_BASE}/records/${collection}/${id}`, {
                method: 'DELETE'
            });
            return response.json();
        }
    },

    // Backup API
    backup: {
        list: async () => {
            const response = await fetch(`${API_BASE}/backup/list`);
            return response.json();
        },
        create: async (collection) => {
            const response = await fetch(`${API_BASE}/backup/${collection}/backup`, {
                method: 'POST'
            });
            return response.json();
        },
        restore: async (data) => {
            const response = await fetch(`${API_BASE}/backup/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },
        delete: async (backupName) => {
            const response = await fetch(`${API_BASE}/backup/${backupName}`, {
                method: 'DELETE'
            });
            return response.json();
        }
    },

    // Health check
    health: async () => {
        const response = await fetch(`${API_BASE}/health`);
        return response.json();
    }
};

// Utility functions
function showToast(message, type = 'success') {
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = container.lastElementChild;
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function showError(message) {
    showToast(message, 'danger');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}