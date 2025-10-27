document.getElementById('urlForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const airbnbUrl = document.getElementById('airbnbUrl').value;

    // Basic URL validation for Airbnb links
    if (!airbnbUrl.includes('airbnb.com')) {
        alert('Please enter a valid Airbnb listing URL');
        return;
    }

    // Store the URL for later use
    localStorage.setItem('airbnbUrl', airbnbUrl);

    // TODO: Send to make.com webhook
    // For now, just log it
    console.log('Airbnb URL submitted:', airbnbUrl);

    // TODO: Navigate to results page (page 2)
    alert('URL submitted successfully! (Integration with make.com coming soon)');
});
