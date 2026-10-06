const url = 'https://script.google.com/macros/s/AKfycbzoAvxRHV7jzm3AZstFIocKRNa1b_aFKppF4kt1CUfY_Ylw-oSkUiGOzKalR18eI2L5Qg/exec?action=addPenjualanBundleProduk';
const body = JSON.stringify({
  action: 'addPenjualanBundleProduk',
  id_produk: 'PRD-001',
  id_paket: 'mahasiswa',
  nama_paket: 'TEST BOT OLD URL',
  total_harga: 0,
  total_modal: 0,
  terjual_oleh: 'Ara',
  metode_pembayaran: 'Cash',
  tanggal: new Date().toISOString(),
  items: [{ id_varian: 'VAR-1787669563044', nama_varian: 'Test', jumlah: 1 }]
});

const start = Date.now();
fetch(url, {
  method: 'POST',
  body: body,
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  redirect: 'follow'
})
.then(r => {
  console.log('Status:', r.status, 'Time:', Date.now() - start);
  return r.text();
})
.then(t => console.log('Response preview:', t.substring(0, 100)))
.catch(console.error);
