const url = 'https://script.google.com/macros/s/AKfycbzoAvxRHV7jzm3AZstFIocKRNa1b_aFKppF4kt1CUfY_Ylw-oSkUiGOzKalR18eI2L5Qg/exec?action=getProdukById&id=PRD-003&token=undefined&t=' + Date.now();
fetch(url, { redirect: 'follow' })
.then(r => r.json())
.then(data => {
  if (data.data && data.data.penjualan_bundle) {
    const p = data.data.penjualan_bundle;
    const len = p.length;
    console.log('Total sales PRD-003 (OLD):', len);
  }
})
