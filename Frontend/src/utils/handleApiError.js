export const handleApiError = (err, navigate) => {
    console.log('API Error details:', err.response?.data);
    
    // Check for 401 status code
    if (err.response?.status === 401 || 
        err.response?.data?.Code === "TOKEN_EXPIRED" || 
        err.response?.data?.Code === "INVALID_TOKEN" || 
        err.response?.data?.Code === "NO_TOKEN") {
        
        console.log('Token error detected, clearing session...');
        
        // Clear local storage
        localStorage.clear();
        
        // Show message to user
        alert("Your session has expired. Please login again.");
        
        // Redirect to login
        navigate('/', { replace: true });
        return;
    }
    
    // Handle other errors
    console.error('Other API Error:', err);
    alert(err.response?.data?.Error || 'An error occurred');
}; 