const url = 'https://script.google.com/macros/s/AKfycbw4UVTeqWldKdfsCyfbfYBpepIjjm08PVSndA19MuCqrV30PktJ1y5-1oFD1lL2KYfgEg/exec';

fetch(url + '?action=getProdukById&id=PRD-001')
  .then(r => r.json())
  .then(d => console.log('Response:', JSON.stringify(d, null, 2)));
