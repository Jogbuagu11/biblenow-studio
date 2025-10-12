# Streaming Limit Email Function - Troubleshooting Guide

## ✅ **Function Status**
- **Function Name**: `send-streaming-limit-email`
- **Status**: ACTIVE (Version 3)
- **Last Deployed**: Just deployed with enhanced logging and error handling

## 🔧 **Improvements Made**

### **1. Enhanced Logging**
- Added comprehensive console logging throughout the function
- Logs request data, email payload, and response details
- Better error tracking with stack traces

### **2. Better Error Handling**
- Improved error messages with more details
- Added timestamp to error responses
- Better handling of Resend API errors

### **3. Email Payload Logging**
- Logs email content length and structure
- Tracks Resend API response status
- Records email result in notification metadata

## 🧪 **Testing the Function**

### **Test Script**
Use the provided `test_email_function.js` to test the function:

```bash
node test_email_function.js
```

### **Manual Test via cURL**
```bash
curl -X POST 'https://jhlawjmyorpmafokxtuh.supabase.co/functions/v1/send-streaming-limit-email' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "user_id": "test-user-123",
    "email": "test@example.com",
    "first_name": "Test User",
    "type": "warning",
    "usage_percentage": 75,
    "remaining_minutes": 25,
    "reset_date": "2025-01-20"
  }'
```

## 🔍 **Troubleshooting Steps**

### **1. Check Function Logs**
The function now has comprehensive logging. Look for these log messages:
- `📧 [send-streaming-limit-email] Function called`
- `📧 [send-streaming-limit-email] Request data: {...}`
- `📧 [send-streaming-limit-email] Sending email via Resend...`
- `✅ [send-streaming-limit-email] Email sent successfully`

### **2. Common Issues & Solutions**

#### **Issue: "Resend API key not configured"**
- **Solution**: Verify `RESEND_API_KEY` is set in Supabase secrets
- **Check**: `supabase secrets list` should show `RESEND_API_KEY`

#### **Issue: "Failed to send email"**
- **Check**: Resend API response status and error details
- **Solution**: Verify email address format and Resend account status

#### **Issue: "Missing required fields"**
- **Check**: Ensure all required fields are provided:
  - `user_id`
  - `email`
  - `first_name`
  - `type` (warning or reached)
  - `reset_date`

#### **Issue: Email not received**
- **Check**: Spam folder
- **Verify**: Email address is valid
- **Check**: Resend account limits and status

### **3. Environment Variables**
Required environment variables:
- ✅ `RESEND_API_KEY` - Configured
- ✅ `SUPABASE_URL` - Configured
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Configured

## 📊 **Function Response Format**

### **Success Response**
```json
{
  "success": true,
  "message": "Streaming limit email sent successfully"
}
```

### **Error Response**
```json
{
  "error": "Error description",
  "details": "Additional error details",
  "timestamp": "2025-01-12T10:30:00.000Z"
}
```

## 🎯 **Integration with Notification Service**

The function is called by the `NotificationService` in the web app:

```typescript
// In notificationService.ts
const { data: emailResult, error: emailError } = await supabase.functions.invoke(
  'send-streaming-limit-email',
  {
    body: {
      user_id: notification.user_id,
      email: metadata.email,
      first_name: metadata.first_name,
      type: metadata.notification_type,
      usage_percentage: metadata.usage_percentage,
      remaining_minutes: metadata.remaining_minutes,
      reset_date: metadata.reset_date
    }
  }
);
```

## 🚀 **Next Steps**

1. **Test the function** using the provided test script
2. **Monitor logs** for any issues
3. **Verify email delivery** in test environment
4. **Check notification service integration** in the web app

## 📞 **Support**

If issues persist:
1. Check Supabase function logs in the dashboard
2. Verify Resend account status and limits
3. Test with a simple email address first
4. Check network connectivity and API endpoints

The function is now deployed with enhanced debugging capabilities to help identify and resolve any issues quickly.



