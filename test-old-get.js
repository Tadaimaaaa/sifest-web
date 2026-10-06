const url = 'https://script.google.com/macros/s/AKfycbzoAvxRHV7jzm3AZstFIocKRNa1b_aFKppF4kt1CUfY_Ylw-oSkUiGOzKalR18eI2L5Qg/exec?action=getProdukById&id=PRD-001&token=undefined&t=' + Date.now();
fetch(url, { redirect: 'follow' })
.then(r => r.text())
.then(t => console.log('Response:', t.substring(0, 100)))
.catch(console.error);
