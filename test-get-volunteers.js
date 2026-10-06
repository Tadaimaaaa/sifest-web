const url = 'https://script.google.com/macros/s/AKfycbw4UVTeqWldKdfsCyfbfYBpepIjjm08PVSndA19MuCqrV30PktJ1y5-1oFD1lL2KYfgEg/exec';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({ action: 'login', email: 'admin@sifest.id', password: 'password123' })
})
.then(r => r.json())
.then(loginData => {
  if (loginData.success) {
    const token = loginData.data.session_token;
    console.log('Login success, fetching volunteers...');
    fetch(url + '?action=getVolunteers&token=' + token)
      .then(r => r.json())
      .then(d => console.log('Volunteers:', JSON.stringify(d, null, 2)));
  } else {
    console.log('Login failed', loginData);
  }
});
