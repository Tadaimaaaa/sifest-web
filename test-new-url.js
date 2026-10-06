const url = 'https://script.google.com/macros/s/AKfycbzJfiEuqxyBt2uT1mg2ukqgDLtxWsLA2eLgRUYU9m_N6y_EjSe3bBkXZIwvssGGLvfx4w/exec?action=addPenjualanBundleProduk';
const body = JSON.stringify({
  action: 'addPenjualanBundleProduk',
  id_produk: 'PRD-001',
  id_paket: 'mahasiswa',
  nama_paket: 'TEST BOT NEW URL',
  total_harga: 0,
  total_modal: 0,
  terjual_oleh: 'Ara',
  metode_pembayaran: 'Cash',
  tanggal: new Date().toISOString(),
  items: [{ id_varian: 'VAR-1787669563044', nama_varian: 'Test', jumlah: 1 }]
});

fetch(url, {
  method: 'POST',
  body: body,
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  redirect: 'follow'
})
.then(r => r.text())
.then(t => console.log('Response:', t.substring(0, 300)))
.catch(console.error);
