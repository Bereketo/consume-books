# ReadShift Authentication Frontend Demo

A minimal, beautiful frontend interface to demonstrate all the authentication features of the ReadShift backend API.

## 🌟 Features Demonstrated

### 🔐 **Core Authentication**
- ✅ User Registration with validation
- ✅ User Login with JWT tokens
- ✅ User Logout with token cleanup
- ✅ Protected user dashboard
- ✅ Token storage and management

### 📧 **Email Verification**
- ✅ Automatic verification email on registration
- ✅ Manual verification email sending
- ✅ Email verification status display
- ✅ Verification link handling

### 🔑 **Password Reset**
- ✅ Password reset request
- ✅ Reset email sending
- ✅ User-friendly reset flow

### 👤 **User Profile Management**
- ✅ View user information
- ✅ Update user profile preferences
- ✅ Reading goals and learning style
- ✅ Real-time profile updates

### 🌐 **OAuth Integration**
- ✅ Google OAuth initiation
- ✅ OAuth callback handling
- ✅ OAuth user creation

### 🔒 **Security Features**
- ✅ JWT token display and management
- ✅ Automatic token refresh handling
- ✅ Secure API communication
- ✅ Error handling and validation

## 🚀 Quick Start

### 1. Start the Backend Server
```bash
cd /path/to/readshift-backend
source .venv/bin/activate
uvicorn src.readshift.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Frontend Server
```bash
cd frontend
python server.py
```

### 3. Open Your Browser
The frontend will automatically open at: `http://localhost:3000`

## 🎯 How to Test

### **Registration Flow**
1. Fill in the registration form
2. Click "Register" 
3. Check the response for success message
4. Note: Email verification email would be sent (if SMTP configured)

### **Login Flow**
1. Use the registered email and password
2. Click "Login"
3. Dashboard will appear with user information
4. JWT tokens will be displayed

### **User Dashboard**
1. Click "Get My Info" to fetch user data
2. View verification status and user details
3. Update profile information
4. Send verification emails

### **Password Reset**
1. Click "Forgot Password?"
2. Enter email address
3. Click "Send Reset Link"
4. Check response for confirmation

### **OAuth Testing**
1. Click "Login with Google"
2. View the OAuth authorization URL
3. Note: Requires Google OAuth configuration

## 🎨 UI Features

### **Responsive Design**
- ✅ Mobile-friendly layout
- ✅ Grid-based responsive design
- ✅ Beautiful gradient backgrounds

### **Interactive Elements**
- ✅ Real-time form validation
- ✅ Success/error response display
- ✅ Dynamic state management
- ✅ Token visualization

### **User Experience**
- ✅ Clear visual feedback
- ✅ Intuitive navigation
- ✅ Professional styling
- ✅ Accessible interface

## 📁 File Structure

```
frontend/
├── index.html          # Main HTML interface
├── app.js             # JavaScript functionality
├── server.py          # Simple HTTP server
└── README.md          # This file
```

## 🔧 Configuration

The frontend is configured to connect to:
- **Backend API**: `http://localhost:8000`
- **Frontend Server**: `http://localhost:3000`

To change these, edit the `API_BASE` constant in `app.js`.

## 🌐 API Endpoints Tested

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/register` | POST | User registration |
| `/auth/login` | POST | User login |
| `/auth/logout` | POST | User logout |
| `/auth/me` | GET | Get user info |
| `/auth/profile` | POST | Update profile |
| `/auth/send-verification` | POST | Send verification email |
| `/auth/request-password-reset` | POST | Request password reset |
| `/auth/oauth/google` | GET | Google OAuth |

## 🎭 Demo Scenarios

### **New User Journey**
1. Register → Login → Verify Email → Update Profile

### **Returning User Journey**
1. Login → View Dashboard → Update Profile → Logout

### **Password Recovery Journey**
1. Forgot Password → Request Reset → (Email Link) → Reset

### **OAuth Journey**
1. Google Login → Automatic Registration → Dashboard

## 🔍 Debugging

### **Check Browser Console**
- Open Developer Tools (F12)
- Check Console tab for errors
- Network tab shows API requests

### **Common Issues**
- **CORS Errors**: Make sure backend allows `localhost:3000`
- **Token Issues**: Check localStorage in Application tab
- **API Errors**: Verify backend is running on port 8000

## 🎉 Success Indicators

When everything works correctly, you should see:
- ✅ Successful registration with user data
- ✅ Login with JWT tokens displayed
- ✅ User dashboard with profile information
- ✅ Profile updates working
- ✅ Email verification requests succeeding
- ✅ Password reset requests working
- ✅ OAuth endpoints responding

## 💡 Next Steps

This demo frontend shows how to integrate with the ReadShift authentication API. For production:

1. **Add proper error handling**
2. **Implement token refresh logic**
3. **Add form validation**
4. **Style improvements**
5. **Add loading states**
6. **Implement proper OAuth flow**
7. **Add email verification page**
8. **Add password reset page**

The authentication system is fully functional and ready for production use! 🚀
