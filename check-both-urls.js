const url1 = 'https://script.google.com/macros/s/AKfycbzoAvxRHV7jzm3AZstFIocKRNa1b_aFKppF4kt1CUfY_Ylw-oSkUiGOzKalR18eI2L5Qg/exec?action=getProduk&token=undefined';
const url2 = 'https://script.google.com/macros/s/AKfycbzJfiEuqxyBt2uT1mg2ukqgDLtxWsLA2eLgRUYU9m_N6y_EjSe3bBkXZIwvssGGLvfx4w/exec?action=getProduk&token=undefined';

Promise.all([
  fetch(url1).then(r => r.json()),
  fetch(url2).then(r => r.json())
]).then(([d1, d2]) => {
  console.log('Old URL stock Balado:', d1.data.find(p => p.id_produk === 'PRD-001').varian.find(v => v.nama_varian.includes('Balado')).jumlah);
  console.log('New URL stock Balado:', d2.data.find(p => p.id_produk === 'PRD-001').varian.find(v => v.nama_varian.includes('Balado')).jumlah);
});
