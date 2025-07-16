// ReadShift Authentication Demo Frontend
const API_BASE = 'http://localhost:8000';

// Store tokens in localStorage
let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');

// Debug functions
window.checkDebugInfo = async function () {
    console.log('Checking debug info...');
    console.log('Current accessToken:', accessToken ? 'Present' : 'Missing');

    // Check login status
    const loginStatusEl = document.getElementById('login-status');
    const tokenStatusEl = document.getElementById('token-status');
    const backendStatusEl = document.getElementById('backend-status');

    if (!loginStatusEl || !tokenStatusEl || !backendStatusEl) {
        console.log('Debug elements not found');
        return;
    }

    // Refresh token from localStorage
    accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
        loginStatusEl.textContent = 'Logged in ';
        loginStatusEl.style.color = 'green';
        tokenStatusEl.textContent = accessToken.substring(0, 20) + '...';
        tokenStatusEl.style.color = 'green';
    } else {
        loginStatusEl.textContent = 'Not logged in ';
        loginStatusEl.style.color = 'red';
        tokenStatusEl.textContent = 'None';
        tokenStatusEl.style.color = 'red';
    }

    // Check backend status
    try {
        backendStatusEl.textContent = 'Checking...';
        backendStatusEl.style.color = 'orange';

        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            backendStatusEl.textContent = 'Connected ';
            backendStatusEl.style.color = 'green';
        } else {
            backendStatusEl.textContent = `Error ${response.status} `;
            backendStatusEl.style.color = 'red';
        }
    } catch (error) {
        backendStatusEl.textContent = 'Disconnected ';
        backendStatusEl.style.color = 'red';
        console.log('Backend connection error:', error);
    }
}

// Add styles for loading indicator
const style = document.createElement('style');
style.textContent = `
    .loading-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        margin: 10px 0;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
    }
    
    .loading-indicator .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-indicator p {
        margin: 0;
        color: #666;
        font-size: 14px;
    }
`;
document.head.appendChild(style);

// Initialize the app
document.addEventListener('DOMContentLoaded', function () {
    checkDebugInfo();
    if (accessToken) {
        showLoggedInState();
        getCurrentUser();
    }
});

// Utility functions
function showResponse(elementId, data, isError = false) {
    const element = document.getElementById(elementId);
    element.className = `response ${isError ? 'error' : 'success'}`;
    element.textContent = JSON.stringify(data, null, 2);
    element.classList.remove('hidden');
}

function showLoggedInState() {
    document.getElementById('logged-out-state').classList.add('hidden');
    document.getElementById('logged-in-state').classList.remove('hidden');
    document.getElementById('token-section').classList.remove('hidden');

    // Show book management section when logged in
    const bookSection = document.getElementById('book-management-section');
    if (bookSection) {
        bookSection.style.display = 'block';
    }

    updateTokenDisplay();

    // Update debug info immediately
    setTimeout(checkDebugInfo, 100);
}

function showLoggedOutState() {
    document.getElementById('logged-out-state').classList.remove('hidden');
    document.getElementById('logged-in-state').classList.add('hidden');
    document.getElementById('token-section').classList.add('hidden');
    document.getElementById('user-info').classList.add('hidden');

    // Hide book management section when logged out
    const bookSection = document.getElementById('book-management-section');
    if (bookSection) {
        bookSection.style.display = 'none';
    }

    // Update debug info immediately
    setTimeout(checkDebugInfo, 100);
}

function updateTokenDisplay() {
    if (accessToken) {
        document.getElementById('token-display').innerHTML = `
            <strong>Access Token:</strong><br>
            ${accessToken}<br><br>
            <strong>Refresh Token:</strong><br>
            ${refreshToken || 'Not available'}
        `;
    }
}

function clearTokens() {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
}

function saveTokens(access, refresh) {
    accessToken = access;
    refreshToken = refresh;
    localStorage.setItem('accessToken', access);
    if (refresh) {
        localStorage.setItem('refreshToken', refresh);
    }
}

// API call helper
async function apiCall(endpoint, method = 'GET', data = null, useAuth = false) {
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (useAuth && accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Request failed');
        }

        return result;
    } catch (error) {
        throw error;
    }
}

// Authentication functions
async function register() {
    const data = {
        first_name: document.getElementById('reg-firstname').value,
        last_name: document.getElementById('reg-lastname').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value
    };

    try {
        const result = await apiCall('/auth/register', 'POST', data);
        showResponse('auth-response', {
            message: 'Registration successful! Please check your email for verification.',
            user: result
        });

        // Clear form
        document.getElementById('reg-firstname').value = '';
        document.getElementById('reg-lastname').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';

    } catch (error) {
        showResponse('auth-response', { error: error.message }, true);
    }
}

async function login() {
    const data = {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
    };

    try {
        const result = await apiCall('/auth/login', 'POST', data);

        saveTokens(result.access_token, result.refresh_token);
        showLoggedInState();

        // Update debug info after a short delay to ensure everything is set
        setTimeout(() => {
            checkDebugInfo();
            listBooks(); // Also load books after login
        }, 200);

        showResponse('auth-response', {
            message: 'Login successful!',
            user: result.user
        });

        // Clear form
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';

    } catch (error) {
        showResponse('auth-response', { error: error.message }, true);
    }
}

async function logout() {
    try {
        if (accessToken) {
            await apiCall('/auth/logout', 'POST', null, true);
        }
    } catch (error) {
        console.log('Logout error:', error);
    } finally {
        clearTokens();
        showLoggedOutState();
        showResponse('dashboard-response', { message: 'Logged out successfully!' });
    }
}

async function getCurrentUser() {
    try {
        const result = await apiCall('/auth/me', 'GET', null, true);

        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-details').innerHTML = `
            <div class="user-detail"><strong>ID:</strong> ${result.id}</div>
            <div class="user-detail"><strong>Name:</strong> ${result.first_name} ${result.last_name}</div>
            <div class="user-detail"><strong>Email:</strong> ${result.email}</div>
            <div class="user-detail"><strong>Verified:</strong> ${result.is_verified ? ' Yes' : ' No'}</div>
            <div class="user-detail"><strong>Active:</strong> ${result.is_active ? ' Yes' : ' No'}</div>
            <div class="user-detail"><strong>OAuth Provider:</strong> ${result.oauth_provider || 'None'}</div>
            <div class="user-detail"><strong>Created:</strong> ${new Date(result.created_at).toLocaleString()}</div>
        `;

        // Populate profile form if profile exists
        if (result.profile) {
            document.getElementById('profile-tone').value = result.profile.preferred_tone || '';
            document.getElementById('profile-person').value = result.profile.preferred_person || '';
            document.getElementById('profile-goal').value = result.profile.reading_goal || '';
            document.getElementById('profile-role').value = result.profile.role || '';
            document.getElementById('profile-style').value = result.profile.learning_style || '';
        }

        showResponse('dashboard-response', result);

    } catch (error) {
        showResponse('dashboard-response', { error: error.message }, true);

        if (error.message.includes('401') || error.message.includes('credentials')) {
            clearTokens();
            showLoggedOutState();
        }
    }
}

async function updateProfile() {
    const data = {
        preferred_tone: document.getElementById('profile-tone').value,
        preferred_person: document.getElementById('profile-person').value,
        reading_goal: document.getElementById('profile-goal').value,
        role: document.getElementById('profile-role').value,
        learning_style: document.getElementById('profile-style').value
    };

    try {
        const result = await apiCall('/auth/profile', 'POST', data, true);
        showResponse('dashboard-response', {
            message: 'Profile updated successfully!',
            profile: result
        });
    } catch (error) {
        showResponse('dashboard-response', { error: error.message }, true);
    }
}

// Email verification
async function sendVerificationEmail() {
    try {
        const userResult = await apiCall('/auth/me', 'GET', null, true);
        const result = await apiCall('/auth/send-verification', 'POST', { email: userResult.email });

        showResponse('dashboard-response', {
            message: 'Verification email sent! Check your inbox.',
            result: result
        });
    } catch (error) {
        showResponse('dashboard-response', { error: error.message }, true);
    }
}

// Password reset functions
function showPasswordReset() {
    document.getElementById('password-reset-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
}

function hidePasswordReset() {
    document.getElementById('password-reset-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

async function requestPasswordReset() {
    const email = document.getElementById('reset-email').value;

    try {
        const result = await apiCall('/auth/request-password-reset', 'POST', { email });
        showResponse('auth-response', {
            message: 'Password reset email sent! Check your inbox.',
            result: result
        });

        document.getElementById('reset-email').value = '';
        hidePasswordReset();

    } catch (error) {
        showResponse('auth-response', { error: error.message }, true);
    }
}

// OAuth functions
async function initiateGoogleOAuth() {
    try {
        const result = await apiCall('/auth/oauth/google', 'GET');

        showResponse('oauth-response', {
            message: 'OAuth endpoint working!',
            authorization_url: result.authorization_url,
            note: result.message || 'OAuth requires proper configuration'
        });

        // In a real implementation, you would redirect to the authorization URL
        // window.location.href = result.authorization_url;

    } catch (error) {
        showResponse('oauth-response', { error: error.message }, true);
    }
}

// Handle URL parameters for OAuth callback and email verification
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Handle email verification
    const verificationToken = urlParams.get('token');
    if (verificationToken && window.location.pathname.includes('verify-email')) {
        verifyEmailToken(verificationToken);
    }

    // Handle OAuth callback
    const oauthCode = urlParams.get('code');
    if (oauthCode && window.location.pathname.includes('oauth/callback')) {
        handleOAuthCallback(oauthCode);
    }
}

async function verifyEmailToken(token) {
    try {
        const result = await apiCall('/auth/verify-email', 'POST', { token });
        showResponse('auth-response', {
            message: 'Email verified successfully!',
            result: result
        });
    } catch (error) {
        showResponse('auth-response', { error: error.message }, true);
    }
}

async function handleOAuthCallback(code) {
    try {
        const result = await apiCall(`/auth/oauth/callback/google?code=${code}`, 'GET');

        saveTokens(result.access_token, result.refresh_token);
        showLoggedInState();

        showResponse('oauth-response', {
            message: 'OAuth login successful!',
            user: result.user
        });

    } catch (error) {
        showResponse('oauth-response', { error: error.message }, true);
    }
}

// Book management functions
window.uploadBook = async function () {
    console.log('=== UPLOAD BOOK FUNCTION CALLED ===');
    console.log('Upload button clicked!');
    console.log('Access token:', accessToken ? 'Present' : 'Missing');

    // Show immediate feedback
    alert('Upload function called! Check console for details.');

    if (!accessToken) {
        showResponse('book-response', { error: 'Please login first' }, true);
        return;
    }

    const fileInput = document.getElementById('book-file');
    const title = document.getElementById('book-title').value;
    const author = document.getElementById('book-author').value;
    const genre = document.getElementById('book-genre').value;
    const tags = document.getElementById('book-tags').value;

    console.log('File selected:', fileInput.files[0] ? fileInput.files[0].name : 'None');
    console.log('Title:', title);

    if (!fileInput.files[0] || !title) {
        showResponse('book-response', { error: 'Please select a file and enter a title' }, true);
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const params = new URLSearchParams({
        title: title,
        ...(author && { author }),
        ...(genre && { genre }),
        ...(tags && { tags })
    });

    try {
        console.log('Starting upload...');
        console.log('Upload URL:', `${API_BASE}/books/upload?${params}`);

        showResponse('book-response', { message: 'Uploading book, please wait...' });

        const response = await fetch(`${API_BASE}/books/upload?${params}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);

        if (!response.ok) {
            throw new Error(result.detail || 'Upload failed');
        }

        // Show upload success message
        showResponse('book-response', {
            message: 'Book uploaded successfully! Starting text extraction...',
            book: result
        });

        // Automatically trigger text extraction
        const bookId = result.id || result.book_id;
        if (bookId) {
            // Add a small delay to ensure the upload is fully processed
            setTimeout(() => {
                extractText(bookId)
                    .then(() => {
                        showResponse('book-response', {
                            message: 'Book uploaded and text extraction completed!',
                            book: result
                        });
                        // Refresh book list after extraction
                        listBooks();
                    })
                    .catch(error => {
                        console.error('Extraction error:', error);
                        showResponse('book-response', {
                            warning: 'Book uploaded, but text extraction failed: ' + error.message,
                            book: result
                        });
                        // Still refresh the book list even if extraction fails
                        listBooks();
                    });
            }, 1000); // 1 second delay before starting extraction
        } else {
            throw new Error('Failed to get book ID from upload response');
        }

        // Clear form
        document.getElementById('book-file').value = '';
        document.getElementById('book-title').value = '';
        document.getElementById('book-author').value = '';
        document.getElementById('book-genre').value = '';
        document.getElementById('book-tags').value = '';

    } catch (error) {
        showResponse('book-response', { error: error.message }, true);
    }
}

window.listBooks = async function () {
    if (!accessToken) {
        return;
    }

    try {
        const result = await apiCall('/books/', 'GET', null, true);

        const bookListDiv = document.getElementById('book-list');

        if (result.books.length === 0) {
            bookListDiv.innerHTML = '<p>No books uploaded yet.</p>';
        } else {
            let booksHtml = '<div style="display: grid; gap: 15px;">';

            result.books.forEach(book => {
                booksHtml += `
                    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: #f9f9f9;">
                        <h4 style="margin: 0 0 10px 0; color: #333;">${book.title}</h4>
                        <p style="margin: 5px 0;"><strong>Author:</strong> ${book.author || 'Unknown'}</p>
                        <p style="margin: 5px 0;"><strong>Genre:</strong> ${book.genre || 'Not specified'}</p>
                        <p style="margin: 5px 0;"><strong>Pages:</strong> ${book.page_count || 'Not processed'}</p>
                        <p style="margin: 5px 0;"><strong>Chapters:</strong> ${book.chapter_count}</p>
                        <p style="margin: 5px 0;"><strong>Size:</strong> ${formatFileSize(book.file_size)}</p>
                        <p style="margin: 5px 0;"><strong>Tags:</strong> ${book.tags ? book.tags.join(', ') : 'None'}</p>
                        <div style="margin-top: 10px;">
                            <button class="btn" onclick="viewPDF(${book.id})" style="margin-right: 5px; background: #3498db;"> PDF View</button>
                            <button class="btn btn-secondary" onclick="viewBook(${book.id})" style="margin-right: 5px;"> Text View</button>
                            <button class="btn" onclick="startChat(${book.id})" style="margin-right: 5px; background: #28a745;"> Chat</button>
                            <button class="btn btn-secondary" onclick="extractText(${book.id})" style="margin-right: 5px;"> Extract</button>
                            <button class="btn btn-danger" onclick="deleteBook(${book.id})"> Delete</button>
                        </div>
                    </div>
                `;
            });

            booksHtml += '</div>';
            bookListDiv.innerHTML = booksHtml;
        }

        showResponse('book-response', {
            message: `Found ${result.total} books`,
            books: result.books
        });

    } catch (error) {
        showResponse('book-response', { error: error.message }, true);
    }
}

window.getBookStats = async function () {
    if (!accessToken) {
        return;
    }

    try {
        const result = await apiCall('/books/user/stats', 'GET', null, true);

        const statsDiv = document.getElementById('book-stats');
        statsDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #1976d2;">Total Books</h4>
                    <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #1976d2;">${result.total_books}</p>
                </div>
                <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #7b1fa2;">Total Pages</h4>
                    <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #7b1fa2;">${result.total_pages}</p>
                </div>
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #388e3c;">Total Chapters</h4>
                    <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #388e3c;">${result.total_chapters}</p>
                </div>
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #f57c00;">Total Words</h4>
                    <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #f57c00;">${result.total_words.toLocaleString()}</p>
                </div>
            </div>
        `;

        showResponse('book-response', result);

    } catch (error) {
        showResponse('book-response', { error: error.message }, true);
    }
}

window.viewBook = function (bookId) {
    // Open text-based book viewer in new tab/window
    window.open(`book-viewer.html?bookId=${bookId}`, '_blank');
}

window.viewPDF = function (bookId) {
    // Open native PDF viewer in new tab/window
    window.open(`pdf-viewer.html?bookId=${bookId}`, '_blank');
}

window.startChat = function (bookId) {
    // Store the book ID for the chat interface and open chat
    localStorage.setItem('chatBookId', bookId);
    window.open('chat.html', '_blank');
}

window.extractText = async function (bookId) {
    try {
        const extractionData = {
            book_id: bookId,
            extract_chapters: true,
            chapter_detection_method: "auto"
        };

        const result = await apiCall(`/books/${bookId}/extract-text`, 'POST', extractionData, true);

        showResponse('book-response', {
            message: 'Text extraction completed',
            result: result
        });

        // Refresh book list to show updated chapter count
        listBooks();

    } catch (error) {
        showResponse('book-response', { error: error.message }, true);
    }
}

window.deleteBook = async function (bookId) {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
        return;
    }

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner"></div><p>Deleting book...</p>';
    document.getElementById('book-response').appendChild(loadingIndicator);

    try {
        // Make sure to include credentials and proper headers
        const response = await fetch(`${API_BASE}/books/${bookId}`, {
            method: 'DELETE',
            credentials: 'include',  // This is important for sending cookies
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            mode: 'cors'  // Ensure CORS mode is enabled
        });

        // Remove loading indicator
        loadingIndicator.remove();

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Show success message
        showResponse('book-response', {
            message: result.message || 'Book deleted successfully',
            status: 'success'
        }, false, true);

        // Refresh book list after a short delay
        setTimeout(listBooks, 500);

    } catch (error) {
        console.error('Error deleting book:', error);
        loadingIndicator.remove();

        // Show error message
        let errorMessage = 'Failed to delete book. ';
        
        if (error.message.includes('403')) {
            errorMessage = 'You do not have permission to delete this book.';
        } else if (error.message.includes('404')) {
            errorMessage = 'Book not found or already deleted.';
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Please try again later.';
        }

        showResponse('book-response', { error: errorMessage }, true);
    }
}

function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

window.testUploadFunction = function () {
    console.log('Test upload function called!');
    showResponse('book-response', {
        message: 'Upload function is working! Check console for details.',
        accessToken: accessToken ? 'Present' : 'Missing',
        loginStatus: accessToken ? 'Logged in' : 'Not logged in'
    });
}

// This will be moved to after the functions are defined

// Initialize URL parameter handling
handleUrlParameters();

// Functions are now defined as window properties above

// Load books when user is logged in
document.addEventListener('DOMContentLoaded', function () {
    if (accessToken) {
        listBooks();
    }
});
