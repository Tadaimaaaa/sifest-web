const url = 'https://script.google.com/macros/s/AKfycbzoAvxRHV7jzm3AZstFIocKRNa1b_aFKppF4kt1CUfY_Ylw-oSkUiGOzKalR18eI2L5Qg/exec?action=getProdukById&id=PRD-001&token=undefined&t=' + Date.now();
fetch(url, { redirect: 'follow' })
.then(r => r.json())
.then(data => {
  console.log('Success:', data.success);
  if (data.data) {
    console.log('Produk:', data.data.nama_produk);
    console.log('Penjualan length:', data.data.penjualan_bundle ? data.data.penjualan_bundle.length : 0);
    if (data.data.penjualan_bundle && data.data.penjualan_bundle.length > 0) {
      console.log('Last sale:', data.data.penjualan_bundle[data.data.penjualan_bundle.length - 1]);
    }
  }
})
.catch(e => console.error('Parse error:', e));
