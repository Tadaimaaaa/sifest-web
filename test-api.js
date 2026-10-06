const url = 'https://script.google.com/macros/s/AKfycbzoAvxRHV7jzm3AZstFIocKRNa1b_aFKppF4kt1CUfY_Ylw-oSkUiGOzKalR18eI2L5Qg/exec?action=addPenjualanBundleProduk';
const body = JSON.stringify({
  action: 'addPenjualanBundleProduk',
  id_produk: 'PRD-001',
  id_paket: 'mahasiswa',
  nama_paket: 'Harga Mahasiswa',
  total_harga: 10000,
  total_modal: 9000,
  terjual_oleh: 'Ara',
  metode_pembayaran: 'Cash',
  tanggal: new Date().toISOString(),
  items: [{ id_varian: 'VAR-123', nama_varian: 'Balado', jumlah: 1 }]
});

fetch(url, {
  method: 'POST',
  body: body,
  headers: { 'Content-Type': 'text/plain;charset=utf-8' }
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
