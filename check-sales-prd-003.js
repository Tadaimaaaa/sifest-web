const url = 'https://script.google.com/macros/s/AKfycbzJfiEuqxyBt2uT1mg2ukqgDLtxWsLA2eLgRUYU9m_N6y_EjSe3bBkXZIwvssGGLvfx4w/exec?action=getProdukById&id=PRD-003&token=undefined&t=' + Date.now();
fetch(url, { redirect: 'follow' })
.then(r => r.json())
.then(data => {
  if (data.data && data.data.penjualan_bundle) {
    const p = data.data.penjualan_bundle;
    const len = p.length;
    console.log('Total sales PRD-003:', len);
    for (let i = Math.max(0, len - 3); i < len; i++) {
      console.log(p[i]);
    }
  }
})
