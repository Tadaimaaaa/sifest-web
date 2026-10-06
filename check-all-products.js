const url = 'https://script.google.com/macros/s/AKfycbzJfiEuqxyBt2uT1mg2ukqgDLtxWsLA2eLgRUYU9m_N6y_EjSe3bBkXZIwvssGGLvfx4w/exec?action=getProduk&token=undefined';
fetch(url).then(r => r.json()).then(data => {
  data.data.forEach(p => {
    if (p.varian && p.varian.length > 0) {
      console.log('ID:', p.id_produk, 'Nama:', p.nama_produk);
      p.varian.forEach(v => {
        if (v.nama_varian.includes('Pisang') || v.nama_varian.includes('Singkong')) {
          console.log('  -', v.nama_varian, ':', v.jumlah);
        }
      });
    }
  });
});
