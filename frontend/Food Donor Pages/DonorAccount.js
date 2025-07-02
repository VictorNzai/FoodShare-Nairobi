// DonorAccount.js - Handles donor profile, email verification, and account deletion

document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const profileTab = document.getElementById('profile-tab');
    const notificationsTab = document.getElementById('notifications-tab');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (btn.dataset.tab === 'profile') {
                profileTab.style.display = '';
                notificationsTab.style.display = 'none';
            } else {
                profileTab.style.display = 'none';
                notificationsTab.style.display = '';
            }
        });
    });

    // Fetch and render profile
    fetch('/api/donor/profile', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('fullName').value = data.profile.full_name || '';
                document.getElementById('email').value = data.profile.email || '';
                document.getElementById('phone').value = data.profile.phone || '';
                // Email verification
                const emailStatus = document.getElementById('email-status');
                const verifyBtn = document.getElementById('verify-email-btn');
                if (data.profile.verified) {
                    emailStatus.textContent = 'Verified';
                    emailStatus.className = 'email-status verified';
                    verifyBtn.style.display = 'none';
                } else {
                    emailStatus.textContent = 'Not Verified';
                    emailStatus.className = 'email-status not-verified';
                    verifyBtn.style.display = '';
                }
            }
        });

    // Save profile changes
    document.getElementById('profile-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const full_name = document.getElementById('fullName').value;
        const phone = document.getElementById('phone').value;
        fetch('/api/donor/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ full_name, phone })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message || (data.success ? 'Profile updated!' : 'Update failed.'));
        });
    });

    // Email verification
    document.getElementById('verify-email-btn').addEventListener('click', function() {
        fetch('/api/donor/verify-email', { method: 'POST', credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                alert(data.message || (data.success ? 'Verification email sent!' : 'Failed to send email.'));
            });
    });

    // Delete account
    document.getElementById('delete-account-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
            fetch('/api/donor/account', { method: 'DELETE', credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    alert(data.message || (data.success ? 'Account deleted.' : 'Failed to delete account.'));
                    if (data.success) window.location.href = '../Login.html';
                });
        }
    });
});
