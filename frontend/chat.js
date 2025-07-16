/**
 * ReadShift Chat Interface
 * Handles chat conversations with books using the ReadShift API
 */

class ChatInterface {
    constructor() {
        this.apiBase = 'http://localhost:8000';
        this.currentConversationId = null;
        this.conversations = [];
        this.books = [];
        this.isLoading = false;

        this.init();
    }

    async init() {
        // Check authentication
        const token = localStorage.getItem('accessToken');
        if (!token) {
            window.location.href = '/index.html';
            return;
        }

        // Load initial data
        await this.loadBooks();
        await this.loadConversations();

        // Check if we should start a chat with a specific book
        const chatBookId = localStorage.getItem('chatBookId');
        if (chatBookId) {
            localStorage.removeItem('chatBookId'); // Clear it
            await this.createNewConversation(parseInt(chatBookId));
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auto-resize textarea
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', this.autoResizeTextarea);

        // Send message on Enter (but not Shift+Enter)
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    autoResizeTextarea(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    async loadBooks() {
        try {
            const response = await this.apiCall('/books');
            this.books = response.books || [];
        } catch (error) {
            console.error('Failed to load books:', error);
            this.showError('Failed to load books');
            this.books = []; // Ensure books is always an array
        }
    }

    async loadConversations() {
        try {
            const response = await this.apiCall('/chat/conversations');
            this.conversations = response;
            this.renderConversations();
        } catch (error) {
            console.error('Failed to load conversations:', error);
            this.showError('Failed to load conversations');
        }
    }

    renderConversations() {
        const container = document.getElementById('conversationsList');

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: #666;">
                    <p>No conversations yet.</p>
                    <p>Start a new chat to begin!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.conversations.map(conv => `
            <div class="conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}"
                 onclick="chatInterface.selectConversation(${conv.id})">
                <div class="conversation-content">
                    <div class="conversation-title">${conv.title}</div>
                    <div class="conversation-preview">
                        ${conv.total_messages} messages • ${this.formatDate(conv.updated_at)}
                    </div>
                </div>
                <div class="conversation-actions" onclick="event.stopPropagation()">
                    <button class="action-btn rename-btn" onclick="chatInterface.renameConversation(${conv.id}, '${conv.title.replace(/'/g, "\\'")}')">
                        ✏️
                    </button>
                    <button class="action-btn delete-btn" onclick="chatInterface.deleteConversation(${conv.id})">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    async selectConversation(conversationId) {
        if (this.isLoading) return;

        this.currentConversationId = conversationId;
        this.renderConversations(); // Update active state

        // Show chat interface
        document.getElementById('chatHeader').style.display = 'block';
        document.getElementById('inputContainer').style.display = 'block';

        // Load conversation details
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
            const book = this.books.find(b => b.id === conversation.book_id);
            document.getElementById('chatTitle').textContent = conversation.title;
            document.getElementById('chatSubtitle').textContent = book ? `Book: ${book.title}` : '';
        }

        // Load messages
        await this.loadMessages(conversationId);
    }

    async loadMessages(conversationId) {
        try {
            this.showLoading('Loading messages...');
            const messages = await this.apiCall(`/chat/conversations/${conversationId}/messages`);
            this.renderMessages(messages);
        } catch (error) {
            console.error('Failed to load messages:', error);
            this.showError('Failed to load messages');
        } finally {
            this.hideLoading();
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Start the conversation</h3>
                    <p>Ask questions, request summaries, or get advice about this book.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(msg => `
            <div class="message ${msg.role}">
                <div>${this.formatMessageContent(msg.content)}</div>
                <div class="message-time">${this.formatTime(msg.created_at)}</div>
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    formatMessageContent(content) {
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    async sendMessage() {
        if (this.isLoading || !this.currentConversationId) return;

        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message) return;

        // Get personalization settings
        const messageType = document.getElementById('messageType').value;
        const tone = document.getElementById('tone').value;

        const personalizationSettings = {};
        if (tone) personalizationSettings.tone = tone;

        try {
            this.isLoading = true;
            document.getElementById('sendBtn').disabled = true;

            // Add user message to UI immediately
            this.addMessageToUI('user', message);
            messageInput.value = '';
            messageInput.style.height = 'auto';

            // Show loading indicator
            this.addLoadingMessage();

            // Send message to API
            const response = await this.apiCall(`/chat/conversations/${this.currentConversationId}/message`, {
                method: 'POST',
                body: JSON.stringify({
                    message: message,
                    message_type: messageType,
                    personalization_settings: personalizationSettings
                })
            });

            // Remove loading indicator
            this.removeLoadingMessage();

            if (response.success) {
                // Add AI response to UI
                this.addMessageToUI('assistant', response.response);
            } else {
                this.showError('Failed to get response: ' + (response.error || 'Unknown error'));
            }

        } catch (error) {
            this.removeLoadingMessage();
            console.error('Failed to send message:', error);
            this.showError('Failed to send message');
        } finally {
            this.isLoading = false;
            document.getElementById('sendBtn').disabled = false;
        }
    }

    addMessageToUI(role, content) {
        const container = document.getElementById('messagesContainer');

        // Remove empty state if present
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `
            <div>${this.formatMessageContent(content)}</div>
            <div class="message-time">${this.formatTime(new Date().toISOString())}</div>
        `;

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    addLoadingMessage() {
        const container = document.getElementById('messagesContainer');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant loading-message';
        loadingDiv.innerHTML = '<div class="loading">Thinking...</div>';
        container.appendChild(loadingDiv);
        container.scrollTop = container.scrollHeight;
    }

    removeLoadingMessage() {
        const loadingMessage = document.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    showLoading(message = 'Loading...') {
        // Could implement a global loading indicator here
        console.log(message);
    }

    hideLoading() {
        // Hide global loading indicator
    }

    showError(message) {
        // Simple error display - could be enhanced with a toast system
        const container = document.getElementById('messagesContainer');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        container.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    showSuccess(message) {
        // Simple success display - could be enhanced with a toast system
        const container = document.getElementById('messagesContainer');
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        container.appendChild(successDiv);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('accessToken');

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            ...options
        };

        const response = await fetch(this.apiBase + endpoint, config);

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('accessToken');
                window.location.href = '/index.html';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Global functions for HTML onclick handlers
function showNewChatModal() {
    // Show available books for selection
    if (!Array.isArray(chatInterface.books) || chatInterface.books.length === 0) {
        alert('No books available. Please upload a book first.');
        return;
    }

    let bookOptions = 'Available books:\n\n';
    chatInterface.books.forEach((book, index) => {
        bookOptions += `${index + 1}. ${book.title} by ${book.author || 'Unknown'}\n`;
    });
    bookOptions += '\nEnter the number of the book you want to chat about:';

    const selection = prompt(bookOptions);
    if (selection) {
        const bookIndex = parseInt(selection) - 1;
        if (bookIndex >= 0 && bookIndex < chatInterface.books.length) {
            const book = chatInterface.books[bookIndex];
            chatInterface.createNewConversation(book.id);
        } else {
            alert('Invalid selection. Please try again.');
        }
    }
}

// Enhanced ChatInterface with new conversation creation
ChatInterface.prototype.createNewConversation = async function (bookId) {
    try {
        if (!Array.isArray(this.books)) {
            this.showError('Books not loaded properly');
            return;
        }

        const book = this.books.find(b => b.id === bookId);
        if (!book) {
            this.showError('Book not found');
            return;
        }

        // Create conversation without title - it will be auto-generated after first message
        const response = await this.apiCall('/chat/conversations', {
            method: 'POST',
            body: JSON.stringify({
                book_id: bookId
                // No title - will be auto-generated
            })
        });

        // Reload conversations and select the new one
        await this.loadConversations();
        this.selectConversation(response.id);

    } catch (error) {
        console.error('Failed to create conversation:', error);
        this.showError('Failed to create new conversation');
    }
};

ChatInterface.prototype.renameConversation = async function (conversationId, currentTitle) {
    try {
        const newTitle = prompt('Enter new title:', currentTitle);
        if (!newTitle || newTitle === currentTitle) {
            return; // User cancelled or didn't change the title
        }

        await this.apiCall(`/chat/conversations/${conversationId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                title: newTitle
            })
        });

        // Reload conversations to reflect the change
        await this.loadConversations();
        this.showSuccess('Conversation renamed successfully');

    } catch (error) {
        console.error('Failed to rename conversation:', error);
        this.showError('Failed to rename conversation');
    }
};

ChatInterface.prototype.deleteConversation = async function (conversationId) {
    // Store the conversation ID for the confirmation
    this.pendingDeleteId = conversationId;
    this.showConfirmationModal();
};

ChatInterface.prototype.showConfirmationModal = function () {
    const modal = document.getElementById('confirmationModal');
    modal.classList.add('show');

    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            this.hideConfirmationModal();
        }
    };
};

ChatInterface.prototype.hideConfirmationModal = function () {
    const modal = document.getElementById('confirmationModal');
    modal.classList.remove('show');
    this.pendingDeleteId = null;
};

ChatInterface.prototype.confirmDelete = async function () {
    if (!this.pendingDeleteId) return;

    try {
        await this.apiCall(`/chat/conversations/${this.pendingDeleteId}`, {
            method: 'DELETE'
        });

        // If we deleted the current conversation, clear the chat area
        if (this.currentConversationId === this.pendingDeleteId) {
            this.currentConversationId = null;
            document.getElementById('chatHeader').style.display = 'none';
            document.getElementById('inputContainer').style.display = 'none';
            document.getElementById('messagesContainer').innerHTML = '';
        }

        // Hide modal and reload conversations
        this.hideConfirmationModal();
        await this.loadConversations();
        this.showSuccess('Conversation deleted successfully');
    } catch (error) {
        console.error('Failed to delete conversation:', error);
        this.showError('Failed to delete conversation');
        this.hideConfirmationModal();
    }
};

// Initialize the chat interface when the page loads
let chatInterface;
document.addEventListener('DOMContentLoaded', () => {
    chatInterface = new ChatInterface();
});
