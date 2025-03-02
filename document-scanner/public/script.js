let user = null;

function login() {
  // Grab the username and password from the input fields
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  // Check if the user wants to stay logged in via the checkbox
  const keepLogged = document.querySelector('.keep-logged input[type="checkbox"]').checked;
  // Log what we’re sending to the server for debugging
  console.log('Sending login:', { username, password, keepLogged });
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {
      // Log the server’s response for debugging
      console.log('Login response:', data);
      if (data.error) return alert(data.error);
      user = data;
      // Save user data in localStorage if "Keep me logged in" is checked
      if (keepLogged) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      // Redirect based on user role
      if (user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    })
    .catch(err => alert('Error: ' + err));
}

// This function stays the same as before
function register() {
  // Get the username and password from the input fields
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => alert(data.message || data.error))
    .catch(err => alert('Error: ' + err));
}

if (window.location.pathname.includes('dashboard.html')) {
  // Load user data from localStorage if on the dashboard
  user = JSON.parse(localStorage.getItem('user'));
  if (!user) window.location.href = 'index.html';
  // Update the UI with the user’s name and credits
  document.getElementById('username').textContent = user.username;
  document.getElementById('credits').textContent = user.credits;
}

if (window.location.pathname.includes('admin.html')) {
  // Load user data and check if they’re an admin for the admin dashboard
  user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.role !== 'admin') window.location.href = 'index.html';
  loadAdminDashboard();
}

function scanDocument() {
  // Get the selected file from the input
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) {
    // Alert the user if no file is selected
    alert('Please select a file to scan.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    // Convert the file to a base64 string for storage
    const arrayBuffer = e.target.result;
    const base64Content = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    fetch('/api/scan/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, content: base64Content, filename: file.name })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) return alert(data.error);
        // Handle duplicates silently by showing matches
        if (data.message === 'Document already exists') {
          // No need for an alert here—just show matches
        } else {
          // Update credits if it’s a new upload
          user.credits--;
          document.getElementById('credits').textContent = user.credits;
          localStorage.setItem('user', JSON.stringify(user));
        }
        // Fetch and display matching documents
        fetch(`/api/scan/matches/${data.docId}`)
          .then(res => res.json())
          .then(matches => {
            const list = document.getElementById('matches');
            list.innerHTML = '';
            matches.forEach(m => {
              const li = document.createElement('li');
              li.textContent = `${m.filename} - Similarity: ${(m.similarity * 100).toFixed(2)}%`;
              list.appendChild(li);
            });
          });
      })
      .catch(err => alert('Error: ' + err));
  };
  // Handle any errors reading the file
  reader.onerror = function() {
    alert('Failed to read file.');
  };
  reader.readAsArrayBuffer(file);
}

function requestCredits() {
  // Prompt the user for how many credits they want
  const credits = prompt('How many credits do you want?');
  fetch('/api/credits/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id, requestedCredits: parseInt(credits) })
  })
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(err => alert('Error: ' + err));
}

function loadAdminDashboard() {
  // Fetch and display pending credit requests
  fetch('/api/credits/requests')
    .then(res => res.json())
    .then(requests => {
      const list = document.getElementById('requests');
      list.innerHTML = '';
      requests.forEach(r => {
        const li = document.createElement('li');
        li.innerHTML = `User ${r.userId} requests ${r.requestedCredits} credits`;
        const approveBtn = document.createElement('button');
        approveBtn.textContent = 'Approve';
        approveBtn.onclick = () => approveRequest(r.id, 'approved');
        const denyBtn = document.createElement('button');
        denyBtn.textContent = 'Deny';
        denyBtn.onclick = () => approveRequest(r.id, 'denied');
        li.appendChild(approveBtn);
        li.appendChild(denyBtn);
        list.appendChild(li);
      });
    });
  // Fetch and display system analytics
  fetch('/api/analytics')
    .then(res => res.json())
    .then(stats => {
      const div = document.getElementById('analytics');
      div.innerHTML = `
        <h3>User Credits</h3>
        <p>${stats.users.map(u => `${u.username}: ${u.credits} credits`).join('<br>')}</p>
        <h3>Scan Activity</h3>
        <p>${stats.scans.map(s => `User ${s.userId}: ${s.scans} scans`).join('<br>')}</p>
      `;
    });
}

function approveRequest(requestId, status) {
  // Handle approving or denying a credit request
  fetch('/api/credits/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, status })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadAdminDashboard();
    })
    .catch(err => alert('Error: ' + err));
}

// Check if we’re on the admin page and load the dashboard if so
if (window.location.pathname.includes('admin.html')) {
  user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.role !== 'admin') window.location.href = 'index.html';
  loadAdminDashboard();
}