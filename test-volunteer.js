const url = 'https://script.google.com/macros/s/AKfycbw4UVTeqWldKdfsCyfbfYBpepIjjm08PVSndA19MuCqrV30PktJ1y5-1oFD1lL2KYfgEg/exec';

const payload = {
  action: 'addVolunteer',
  nama: 'TEST VOLUNTEER',
  no_bp: '2210511099',
  jurusan: 'Sistem Informasi',
  alamat: 'Padang',
  no_hp: '081234567890',
  link_ig: 'https://instagram.com/test',
  event_1: 'Seminar',
  event_2: 'Open Bazaar',
  motivasi: 'Tes otomatis dari sistem',
  buktiData: '',
  buktiName: '',
  buktiMime: '',
  krsData: '',
  krsName: '',
  krsMime: '',
  sertifikatFiles: []
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(d => console.log('RESPONSE:', JSON.stringify(d, null, 2)))
.catch(e => console.error('ERROR:', e.message));
