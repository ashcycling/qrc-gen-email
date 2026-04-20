// Load default values when page loads
document.addEventListener('DOMContentLoaded', function() {
    setDefaultValues();
    
    // Setup form submission
    document.getElementById('qrcForm').addEventListener('submit', handleFormSubmit);
});

// Set default values for the form
function setDefaultValues() {
    // Placeholders are now used instead of default values
    // No need to set values programmatically
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.querySelector('.btn-submit');
    const responseText = document.getElementById('responseText');
    
    // Prepare form data - use placeholder values if fields are empty (except subject which defaults to "")
    const qrcSizeValue = document.getElementById('qrcSize').value || document.getElementById('qrcSize').placeholder;
    const mailtoValue = document.getElementById('mailto').value || document.getElementById('mailto').placeholder;
    const subjectValue = document.getElementById('subject').value; // Subject defaults to empty string
    
    // Validate inputs
    const qrcSize = parseInt(qrcSizeValue);
    if (isNaN(qrcSize) || qrcSize < 100 || qrcSize > 1000) {
        responseText.className = 'error';
        responseText.innerHTML = '<strong>✗ Error:</strong> QR Code Size must be between 100 and 1000';
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mailtoValue)) {
        responseText.className = 'error';
        responseText.innerHTML = '<strong>✗ Error:</strong> Please enter a valid email address';
        return;
    }
    
    const formData = {
        qrcSize: qrcSize,
        mailto: mailtoValue,
        subject: subjectValue
    };
    
    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    responseText.className = 'loading';
    responseText.textContent = 'Sending request...';
    
    console.log('Sending formData:', formData);
    console.log('Subject value:', subjectValue);
    
    try {
        // Send POST request to the backend
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        // Handle response
        if (response.ok && result.success) {
            responseText.className = 'success';
            responseText.innerHTML = `<strong>✓ Success:</strong> ${result.message}<br><small>Sent: ${JSON.stringify(formData)} | Received: ${JSON.stringify(result.data.received)}</small>`;
            
            // Display QR code and trigger download
            if (result.data && result.data.qrCodeBase64) {
                // Decode base64 to blob
                const binaryString = atob(result.data.qrCodeBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'image/png' });
                
                // Create object URL for displaying and downloading
                const imageUrl = URL.createObjectURL(blob);
                const qrCodeImage = document.getElementById('qrCodeImage');
                const qrCodeContainer = document.getElementById('qrCodeContainer');
                qrCodeImage.src = imageUrl;
                qrCodeContainer.style.display = 'block';
                
                // Trigger automatic download
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `qr-code-${Date.now()}.png`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up object URL after a delay
                setTimeout(() => URL.revokeObjectURL(imageUrl), 100);
            }
        } else {
            responseText.className = 'error';
            responseText.innerHTML = `
                <strong>✗ Error:</strong> ${result.message || 'Unknown error'}
            `;
        }
    } catch (error) {
        responseText.className = 'error';
        responseText.innerHTML = `
            <strong>✗ Error:</strong> ${error.message}<br>
            <small>Failed to communicate with the server</small>
        `;
        console.error('Request failed:', error);
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate & Send';
    }
}
