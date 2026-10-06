const url = 'https://script.google.com/macros/s/AKfycbzoAvxRHV7jzm3AZstFIocKRNa1b_aFKppF4kt1CUfY_Ylw-oSkUiGOzKalR18eI2L5Qg/exec?action=getProduk&token=undefined&t=' + Date.now();
fetch(url, { redirect: 'follow' })
.then(r => r.json())
.then(data => console.log('Success:', data.success, 'Items:', data.data ? data.data.length : 0))
.catch(e => console.error('Parse error:', e));
