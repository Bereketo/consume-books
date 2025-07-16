// Global variables
let currentBookId = null;
let bookData = null;
let extractionInProgress = false;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log('PDF Viewer initialized');

    // Get book ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentBookId = urlParams.get('bookId');

    if (!currentBookId) {
        alert('No book ID provided');
        goHome();
        return;
    }

    loadBook();
});

// Load book data and display PDF
async function loadBook() {
    try {
        console.log('Loading book:', currentBookId);

        // Get book data from API
        const response = await fetch(`http://localhost:8000/books/${currentBookId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load book: ${response.status}`);
        }

        bookData = await response.json();
        console.log('Book data loaded:', bookData);

        // Update UI with book info
        updateBookInfo();

        // Load PDF directly
        loadPDF();

    } catch (error) {
        console.error('Error loading book:', error);
        alert('Failed to load book. Please try again.');
    }
}

// Update book information in sidebar
function updateBookInfo() {
    if (!bookData) return;

    document.getElementById('book-title').textContent = bookData.title || 'Unknown Title';
    document.getElementById('book-author').textContent = bookData.author || 'Unknown Author';
    document.getElementById('book-pages').textContent = bookData.total_pages || '-';

    // Update detailed info
    const detailsEl = document.getElementById('book-details');
    detailsEl.innerHTML = `
        <p><strong>Title:</strong> ${bookData.title || 'Unknown'}</p>
        <p><strong>Author:</strong> ${bookData.author || 'Unknown'}</p>
        <p><strong>Pages:</strong> ${bookData.total_pages || 'Unknown'}</p>
        <p><strong>File Size:</strong> ${formatFileSize(bookData.file_size)}</p>
        <p><strong>Uploaded:</strong> ${formatDate(bookData.created_at)}</p>
        <p><strong>Format:</strong> PDF</p>
        
        <div style="margin-top: 15px; padding: 10px; background: #ecf0f1; border-radius: 4px;">
            <p><strong>Native PDF Features:</strong></p>
            <ul style="margin: 5px 0 0 20px; font-size: 13px;">
                <li>Original formatting preserved</li>
                <li>Built-in search and zoom</li>
                <li>Print and download support</li>
                <li>Fast loading - no processing needed</li>
            </ul>
        </div>
    `;
}

// Load PDF using PDF.js viewer
function loadPDF() {
    // Use the full file_path from the book data, which includes the correct directory structure
    const pdfPath = `http://localhost:8000/${bookData.file_path}`;
    const viewerUrl = `http://localhost:8000/web/viewer.html?file=${encodeURIComponent(pdfPath)}`;

    console.log('Loading PDF from:', viewerUrl);
    console.log('PDF file path:', pdfPath);

    const iframe = document.getElementById('pdf-iframe');
    const loading = document.getElementById('loading');

    // Set up iframe load handler
    iframe.onload = function () {
        console.log('PDF loaded successfully');
        loading.style.display = 'none';
        iframe.style.display = 'block';
    };

    iframe.onerror = function () {
        console.error('Failed to load PDF');
        loading.innerHTML = `
            <div style="color: #e74c3c;">
                <h3>Failed to load PDF</h3>
                <p>The PDF file could not be displayed.</p>
                <button class="toolbar-btn" onclick="loadBook()">Retry</button>
                <button class="toolbar-btn secondary" onclick="openLegacyViewer()">Use Text Viewer</button>
            </div>
        `;
    };

    // Load the PDF
    iframe.src = viewerUrl;
}

// Sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function showTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.style.display = 'none');

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.sidebar-tab');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    document.getElementById(`tab-${tabName}`).style.display = 'block';

    // Add active class to clicked button
    event.target.classList.add('active');
}

// Text extraction functions
async function startExtraction() {
    if (extractionInProgress) {
        console.log('Extraction already in progress');
        return;
    }

    extractionInProgress = true;

    // Show extraction panel
    const panel = document.getElementById('extraction-panel');
    panel.classList.add('show');

    // Update status
    updateExtractionStatus('processing', 'Starting text extraction...');

    try {
        console.log('Starting text extraction for book:', currentBookId);

        const response = await fetch(`http://localhost:8000/books/${currentBookId}/extract`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Extraction failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('Extraction completed:', result);

        updateExtractionStatus('complete', 'Text extraction completed! Advanced features are now available.');

        // Reload book data to get chapters
        setTimeout(() => {
            loadBookWithChapters();
        }, 1000);

    } catch (error) {
        console.error('Extraction error:', error);
        updateExtractionStatus('error', `Extraction failed: ${error.message}`);
    } finally {
        extractionInProgress = false;
    }
}

function updateExtractionStatus(status, message) {
    const icon = document.getElementById('status-icon');
    const messageEl = document.getElementById('extraction-message');

    // Update icon
    icon.className = `status-icon ${status}`;
    switch (status) {
        case 'pending':
            icon.textContent = '⏳';
            break;
        case 'processing':
            icon.textContent = '🔄';
            break;
        case 'complete':
            icon.textContent = '✅';
            break;
        case 'error':
            icon.textContent = '❌';
            break;
    }

    // Update message
    messageEl.textContent = message;
}

// Load book data with chapters after extraction
async function loadBookWithChapters() {
    try {
        const response = await fetch(`http://localhost:8000/books/${currentBookId}/chapters`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        if (response.ok) {
            const chapters = await response.json();
            updateChaptersList(chapters);
        }
    } catch (error) {
        console.error('Error loading chapters:', error);
    }
}

function updateChaptersList(chapters) {
    const chaptersEl = document.getElementById('chapters-list');

    if (!chapters || chapters.length === 0) {
        chaptersEl.innerHTML = '<p>No chapters found. Try extracting text again.</p>';
        return;
    }

    let html = '<h4>Available Chapters:</h4>';
    chapters.forEach((chapter, index) => {
        html += `
            <div style="padding: 8px; margin: 5px 0; background: #f8f9fa; border-radius: 4px; cursor: pointer;" 
                 onclick="openLegacyViewer(${index})">
                <strong>${chapter.title}</strong>
                ${chapter.page_start ? `<br><small>Pages ${chapter.page_start}-${chapter.page_end}</small>` : ''}
            </div>
        `;
    });

    chaptersEl.innerHTML = html;
}

// Navigation functions
function goHome() {
    window.location.href = '/dashboard.html';
}

function openLegacyViewer(chapterIndex = 0) {
    const url = `/book-viewer.html?bookId=${currentBookId}${chapterIndex ? `&chapter=${chapterIndex}` : ''}`;
    window.location.href = url;
}

// Utility functions
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
}

// Handle authentication
function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Check auth on load
if (!checkAuth()) {
    // Will redirect to login
}
