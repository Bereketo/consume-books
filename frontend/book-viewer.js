// ReadShift Book Viewer
const API_BASE = 'http://localhost:8000';

// Global state
let currentBook = null;
let currentChapter = 0;
let chapters = [];
let highlights = [];
let selectedHighlightColor = 'yellow';
let accessToken = localStorage.getItem('accessToken');

// Initialize viewer
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, checking page number element...');
    const pageNumberEl = document.getElementById('page-number');
    console.log('Initial page number element:', pageNumberEl);

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');

    if (bookId) {
        loadBook(bookId);
    } else {
        showError('No book ID provided');
    }
});

// Load book data
async function loadBook(bookId) {
    try {
        // Load book details
        const bookResponse = await fetch(`${API_BASE}/books/${bookId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!bookResponse.ok) {
            throw new Error('Failed to load book');
        }

        currentBook = await bookResponse.json();

        // Update book info
        document.getElementById('book-title').textContent = currentBook.title;
        document.getElementById('book-author').textContent = currentBook.author || 'Unknown Author';

        // Load chapters
        const chaptersResponse = await fetch(`${API_BASE}/books/${bookId}/chapters`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!chaptersResponse.ok) {
            throw new Error('Failed to load chapters');
        }

        chapters = await chaptersResponse.json();

        if (chapters.length === 0) {
            showError('No chapters found. Please extract text first.');
            return;
        }

        // Render chapter list
        renderChapterList();

        // Load first chapter
        loadChapter(0);

        // Ensure page number is updated after a short delay
        setTimeout(() => {
            updatePageNumber(0);
        }, 500);

    } catch (error) {
        console.error('Error loading book:', error);
        showError('Failed to load book: ' + error.message);
    }
}

// Render chapter list in sidebar
function renderChapterList() {
    const chapterList = document.getElementById('chapter-list');

    if (chapters.length === 0) {
        chapterList.innerHTML = '<div class="loading">No chapters available</div>';
        return;
    }

    let html = '';
    chapters.forEach((chapter, index) => {
        const wordCount = chapter.word_count || 0;
        const pageInfo = chapter.page_start && chapter.page_end
            ? `Pages ${chapter.page_start}-${chapter.page_end}`
            : `Chapter ${index + 1}`;

        html += `
            <div class="chapter-item ${index === currentChapter ? 'active' : ''}" 
                 onclick="loadChapter(${index})">
                <div class="chapter-title">${chapter.title || `Chapter ${index + 1}`}</div>
                <div class="chapter-info">${pageInfo} • ${wordCount} words</div>
            </div>
        `;
    });

    chapterList.innerHTML = html;
}

// Load specific chapter
async function loadChapter(chapterIndex) {
    if (chapterIndex < 0 || chapterIndex >= chapters.length) {
        return;
    }

    currentChapter = chapterIndex;
    const chapter = chapters[chapterIndex];

    // Update active chapter in sidebar
    document.querySelectorAll('.chapter-item').forEach((item, index) => {
        item.classList.toggle('active', index === chapterIndex);
    });

    // Update navigation buttons
    document.getElementById('prev-btn').disabled = chapterIndex === 0;
    document.getElementById('next-btn').disabled = chapterIndex === chapters.length - 1;

    // Update progress
    const progress = ((chapterIndex + 1) / chapters.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    // Update page number
    updatePageNumber(chapterIndex);

    // Load chapter content
    const pageContent = document.getElementById('page-content');

    if (!chapter.raw_text) {
        pageContent.innerHTML = `
            <div class="chapter-header">${chapter.title || `Chapter ${chapterIndex + 1}`}</div>
            <p><em>No text content available for this chapter.</em></p>
        `;
        return;
    }

    // Format and display text
    const formattedText = formatChapterText(chapter);
    pageContent.innerHTML = formattedText;

    // Apply existing highlights
    await applyHighlights();

    // Scroll to top
    document.getElementById('reader-area').scrollTop = 0;

    // Enable text selection for highlighting
    enableTextSelection();

    // Force update page number after content is loaded
    setTimeout(() => {
        updatePageNumber(chapterIndex);
    }, 100);
}

// Format chapter text for display
function formatChapterText(chapter) {
    const title = chapter.title || `Chapter ${currentChapter + 1}`;
    let text = chapter.raw_text || '';

    // Split into paragraphs
    const paragraphs = text.split('\n').filter(p => p.trim().length > 0);

    let html = `<div class="chapter-header">${title}</div>`;

    paragraphs.forEach((paragraph, index) => {
        // Add paragraph with unique ID for highlighting
        html += `<p id="para-${index}">${escapeHtml(paragraph.trim())}</p>`;
    });

    return html;
}

// Update page number display
function updatePageNumber(chapterIndex) {
    console.log('updatePageNumber called with chapterIndex:', chapterIndex);

    const pageNumberEl = document.getElementById('page-number');

    if (!pageNumberEl) {
        console.error('Page number element not found! Creating it...');
        // Try to create the element if it doesn't exist
        const pageContainer = document.querySelector('.page-container');
        if (pageContainer) {
            const newPageNumber = document.createElement('div');
            newPageNumber.id = 'page-number';
            newPageNumber.className = 'page-number';
            pageContainer.appendChild(newPageNumber);
            console.log('Created new page number element');
        } else {
            console.error('Page container not found either!');
            return;
        }
    }

    const chapter = chapters[chapterIndex];
    let pageNumber = 1; // Default page number

    // Calculate the current page number based on chapter data
    if (chapter && chapter.page_start) {
        // Use the starting page of the current chapter as the page number
        pageNumber = chapter.page_start;
    } else {
        // Fallback: calculate based on chapter index
        // Assume each chapter starts on a new page
        pageNumber = chapterIndex + 1;
    }

    console.log('Setting page number to:', pageNumber);
    const finalPageNumberEl = document.getElementById('page-number');
    if (finalPageNumberEl) {
        finalPageNumberEl.textContent = pageNumber.toString();
        console.log('Page number updated successfully to:', pageNumber);
    } else {
        console.error('Still cannot find page number element after creation attempt');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Enable text selection and highlighting
function enableTextSelection() {
    const pageContent = document.getElementById('page-content');

    pageContent.addEventListener('mouseup', function () {
        const selection = window.getSelection();
        if (selection.toString().trim().length > 0) {
            highlightSelectedText(selection);
        }
    });
}

// Highlight selected text
function highlightSelectedText(selection) {
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();

    if (selectedText.length < 3) return; // Minimum text length

    // Check if the selected text is already highlighted
    const startContainer = range.startContainer;

    // If clicking on an existing highlight, remove it
    if (startContainer.parentElement && startContainer.parentElement.classList.contains('highlight')) {
        removeHighlight(startContainer.parentElement);
        selection.removeAllRanges();
        return;
    }

    // Create highlight span
    const highlightSpan = document.createElement('span');
    highlightSpan.className = `highlight ${selectedHighlightColor}`;
    highlightSpan.title = 'Double-click to remove highlight';
    highlightSpan.style.cursor = 'pointer';

    // Add double-click handler for removal
    highlightSpan.ondblclick = function (e) {
        e.stopPropagation();
        removeHighlight(this);
    };

    // Add single click for visual feedback
    highlightSpan.onclick = function (e) {
        e.stopPropagation();
        this.style.opacity = '0.7';
        setTimeout(() => {
            this.style.opacity = '1';
        }, 200);
    };

    try {
        // Wrap selection in highlight span
        range.surroundContents(highlightSpan);

        // Save highlight
        saveHighlight({
            chapterIndex: currentChapter,
            text: selectedText,
            color: selectedHighlightColor,
            timestamp: new Date().toISOString()
        });

        // Clear selection
        selection.removeAllRanges();

        // Show success feedback
        showHighlightFeedback('Text highlighted! Double-click to remove.');

    } catch (error) {
        console.error('Error highlighting text:', error);
        // Fallback: just clear selection
        selection.removeAllRanges();
    }
}

// Set highlight color
function setHighlightColor(color) {
    selectedHighlightColor = color;

    // Update UI to show selected color
    document.querySelectorAll('.highlight-btn').forEach(btn => {
        btn.style.border = '2px solid #ddd';
    });

    document.querySelector(`.highlight-btn.${color}`).style.border = '2px solid #333';
}

// Save highlight to backend
async function saveHighlight(highlight) {
    try {
        const response = await fetch(`${API_BASE}/highlights/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                book_id: currentBook.id,
                chapter_id: chapters[currentChapter]?.id,
                highlighted_text: highlight.text,
                chapter_index: highlight.chapterIndex,
                color: highlight.color,
                note: highlight.note || null
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save highlight');
        }

        const savedHighlight = await response.json();
        console.log('Highlight saved:', savedHighlight);

        // Also save to local storage as backup
        const bookHighlights = getBookHighlights();
        bookHighlights.push(highlight);
        localStorage.setItem(`highlights_${currentBook.id}`, JSON.stringify(bookHighlights));

    } catch (error) {
        console.error('Error saving highlight:', error);
        // Fallback to local storage
        const bookHighlights = getBookHighlights();
        bookHighlights.push(highlight);
        localStorage.setItem(`highlights_${currentBook.id}`, JSON.stringify(bookHighlights));
    }
}

// Get highlights for current book from backend
async function getBookHighlights() {
    try {
        const response = await fetch(`${API_BASE}/highlights/book/${currentBook.id}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            const highlights = await response.json();
            return highlights.map(h => ({
                chapterIndex: h.chapter_index,
                text: h.highlighted_text,
                color: h.color,
                timestamp: h.created_at,
                id: h.id
            }));
        }
    } catch (error) {
        console.error('Error fetching highlights:', error);
    }

    // Fallback to local storage
    const stored = localStorage.getItem(`highlights_${currentBook.id}`);
    return stored ? JSON.parse(stored) : [];
}

// Apply existing highlights to current chapter
async function applyHighlights() {
    const bookHighlights = await getBookHighlights();
    const chapterHighlights = bookHighlights.filter(h => h.chapterIndex === currentChapter);

    // Note: This is a simplified implementation
    // In a production app, you'd need more sophisticated text matching
    chapterHighlights.forEach(highlight => {
        // Find and highlight text (simplified approach)
        highlightTextInContent(highlight.text, highlight.color);
    });
}

// Simple text highlighting (basic implementation)
function highlightTextInContent(text, color) {
    const pageContent = document.getElementById('page-content');
    const walker = document.createTreeWalker(
        pageContent,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }

    textNodes.forEach(textNode => {
        const content = textNode.textContent;
        const index = content.indexOf(text);
        if (index !== -1) {
            const parent = textNode.parentNode;
            const before = content.substring(0, index);
            const highlighted = content.substring(index, index + text.length);
            const after = content.substring(index + text.length);

            const span = document.createElement('span');
            span.className = `highlight ${color}`;
            span.textContent = highlighted;
            span.title = 'Click to remove highlight';
            span.onclick = function () {
                removeHighlight(this);
            };

            parent.insertBefore(document.createTextNode(before), textNode);
            parent.insertBefore(span, textNode);
            parent.insertBefore(document.createTextNode(after), textNode);
            parent.removeChild(textNode);
        }
    });
}

// Remove highlight
async function removeHighlight(highlightElement) {
    const text = highlightElement.textContent;
    const color = highlightElement.className.split(' ').find(c => ['yellow', 'green', 'blue', 'pink'].includes(c));

    // Remove from DOM
    const textNode = document.createTextNode(text);
    highlightElement.parentNode.replaceChild(textNode, highlightElement);

    // Remove from backend
    try {
        const bookHighlights = await getBookHighlights();
        const highlightToRemove = bookHighlights.find(h =>
            h.chapterIndex === currentChapter && h.text === text && h.color === color
        );

        if (highlightToRemove && highlightToRemove.id) {
            const response = await fetch(`${API_BASE}/highlights/${highlightToRemove.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.ok) {
                showHighlightFeedback('Highlight removed!');
            }
        }
    } catch (error) {
        console.error('Error removing highlight from backend:', error);
    }

    // Also remove from local storage as backup
    const localHighlights = JSON.parse(localStorage.getItem(`highlights_${currentBook.id}`) || '[]');
    const updatedHighlights = localHighlights.filter(h =>
        !(h.chapterIndex === currentChapter && h.text === text)
    );
    localStorage.setItem(`highlights_${currentBook.id}`, JSON.stringify(updatedHighlights));
}

// Navigation functions
function previousChapter() {
    if (currentChapter > 0) {
        loadChapter(currentChapter - 1);
    }
}

function nextChapter() {
    if (currentChapter < chapters.length - 1) {
        loadChapter(currentChapter + 1);
    }
}

// Show highlight feedback
function showHighlightFeedback(message) {
    // Create or update feedback element
    let feedback = document.getElementById('highlight-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'highlight-feedback';
        feedback.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #2ecc71;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(feedback);
    }

    feedback.textContent = message;
    feedback.style.opacity = '1';

    // Hide after 3 seconds
    setTimeout(() => {
        feedback.style.opacity = '0';
    }, 3000);
}

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const viewerContainer = document.getElementById('viewer-container');

    sidebar.classList.toggle('collapsed');

    // Update container class for CSS styling
    if (sidebar.classList.contains('collapsed')) {
        viewerContainer.classList.add('sidebar-collapsed');
    } else {
        viewerContainer.classList.remove('sidebar-collapsed');
    }
}

// Go back to home
function goHome() {
    window.location.href = 'index.html';
}

// Show error message
function showError(message) {
    document.getElementById('page-content').innerHTML = `
        <div style="text-align: center; padding: 50px; color: #e74c3c;">
            <h2>Error</h2>
            <p>${message}</p>
            <button class="toolbar-btn" onclick="goHome()" style="margin-top: 20px;">Go Back to Library</button>
        </div>
    `;
}

// Tab management
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Activate selected tab button
    event.target.classList.add('active');

    // Load content for the tab
    if (tabName === 'bookmarks') {
        loadBookmarks();
    } else if (tabName === 'highlights') {
        loadHighlightsList();
    }
}

// Bookmark management
async function addBookmark() {
    const title = prompt('Bookmark title (optional):') || `Chapter ${currentChapter + 1}`;

    try {
        const response = await fetch(`${API_BASE}/highlights/bookmarks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                book_id: currentBook.id,
                chapter_id: chapters[currentChapter]?.id,
                title: title,
                chapter_index: currentChapter,
                position: 0
            })
        });

        if (response.ok) {
            loadBookmarks(); // Refresh bookmarks list
        } else {
            alert('Failed to add bookmark');
        }
    } catch (error) {
        console.error('Error adding bookmark:', error);
        alert('Failed to add bookmark');
    }
}

async function loadBookmarks() {
    try {
        const response = await fetch(`${API_BASE}/highlights/bookmarks/book/${currentBook.id}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            const bookmarks = await response.json();
            renderBookmarks(bookmarks);
        }
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        document.getElementById('bookmark-list').innerHTML = '<div class="loading">Failed to load bookmarks</div>';
    }
}

function renderBookmarks(bookmarks) {
    const bookmarkList = document.getElementById('bookmark-list');

    if (bookmarks.length === 0) {
        bookmarkList.innerHTML = '<div class="loading">No bookmarks yet</div>';
        return;
    }

    let html = '';
    bookmarks.forEach(bookmark => {
        const chapterTitle = chapters[bookmark.chapter_index]?.title || `Chapter ${bookmark.chapter_index + 1}`;
        html += `
            <div class="bookmark-item" onclick="goToBookmark(${bookmark.chapter_index})">
                <div class="bookmark-title">${bookmark.title || chapterTitle}</div>
                <div class="bookmark-info">${chapterTitle} • ${new Date(bookmark.created_at).toLocaleDateString()}</div>
            </div>
        `;
    });

    bookmarkList.innerHTML = html;
}

function goToBookmark(chapterIndex) {
    loadChapter(chapterIndex);
    showTab('chapters'); // Switch back to chapters tab
}

async function loadHighlightsList() {
    try {
        const highlights = await getBookHighlights();
        renderHighlightsList(highlights);
    } catch (error) {
        console.error('Error loading highlights list:', error);
        document.getElementById('highlight-list').innerHTML = '<div class="loading">Failed to load highlights</div>';
    }
}

function renderHighlightsList(highlights) {
    const highlightList = document.getElementById('highlight-list');

    if (highlights.length === 0) {
        highlightList.innerHTML = '<div class="loading">No highlights yet</div>';
        return;
    }

    let html = '';
    highlights.forEach(highlight => {
        const chapterTitle = chapters[highlight.chapterIndex]?.title || `Chapter ${highlight.chapterIndex + 1}`;
        const truncatedText = highlight.text.length > 100 ? highlight.text.substring(0, 100) + '...' : highlight.text;

        html += `
            <div class="highlight-item" onclick="goToHighlight(${highlight.chapterIndex})">
                <div class="highlight-text ${highlight.color}">"${truncatedText}"</div>
                <div class="highlight-meta">${chapterTitle} • ${new Date(highlight.timestamp).toLocaleDateString()}</div>
            </div>
        `;
    });

    highlightList.innerHTML = html;
}

function goToHighlight(chapterIndex) {
    loadChapter(chapterIndex);
    showTab('chapters'); // Switch back to chapters tab
}

// Test function for page number
function testPageNumber() {
    console.log('=== PAGE NUMBER TEST ===');
    console.log('Current chapter:', currentChapter);
    console.log('Chapters array:', chapters);

    const pageNumberEl = document.getElementById('page-number');
    console.log('Page number element:', pageNumberEl);

    if (pageNumberEl) {
        console.log('Current page number text:', pageNumberEl.textContent);

        // Calculate test page number
        const chapter = chapters[currentChapter];
        let testPageNumber = 1;
        if (chapter && chapter.page_start) {
            testPageNumber = chapter.page_start;
        } else {
            testPageNumber = currentChapter + 1;
        }

        pageNumberEl.textContent = testPageNumber.toString();
        console.log('Updated page number text to:', testPageNumber);
    } else {
        console.error('Page number element not found!');
        alert('Page number element not found! Check console for details.');
    }

    // Try to force update
    updatePageNumber(currentChapter);
}

// Initialize highlight color
setHighlightColor('yellow');
