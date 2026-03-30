document.addEventListener('DOMContentLoaded', () => {

    // Helper functions for validating or rejecting table rows
    const validationButtons = document.querySelectorAll('.action-btn.validate');
    const rejectionButtons = document.querySelectorAll('.action-btn.reject');

    validationButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const statusCell = row.querySelector('.status').parentElement;
            
            // Re-render cell to show validated state
            statusCell.innerHTML = '<span class="status validated">Validated</span>';
            
            // Change action buttons to view only
            const actionCell = row.querySelector('td:last-child');
            actionCell.innerHTML = '<button class="action-btn view" title="View Details">&#128065;</button>';
            
            // Optional API call simulation
            console.log(`Incident ${row.querySelector('td:first-child').innerText} validated.`);
        });
    });

    rejectionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            
            if(confirm("Are you sure you want to reject this report? This will remove it from main system mapping.")) {
                const statusCell = row.querySelector('.status').parentElement;
                
                // Re-render cell to show rejected state
                statusCell.innerHTML = '<span class="status rejected">Rejected</span>';
                
                // Change action buttons to view only
                const actionCell = row.querySelector('td:last-child');
                actionCell.innerHTML = '<button class="action-btn view" title="View Details">&#128065;</button>';
                
                // Optional API call simulation
                console.log(`Incident ${row.querySelector('td:first-child').innerText} rejected.`);
            }
        });
    });

    // Handle view buttons (delegated event if elements are dynamically added)
    document.querySelector('.reports-table').addEventListener('click', (e) => {
        if(e.target.closest('.action-btn.view')) {
            const rowId = e.target.closest('tr').querySelector('td:first-child').innerText;
            alert(`Opening detailed modal view for report: ${rowId}`);
        }
    });

    // Dashboard Logout logic
    const logoutBtn = document.querySelector('.logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm("Log out of Admin Hub?")) {
                window.location.href = 'login.html';
            }
        });
    }
});
