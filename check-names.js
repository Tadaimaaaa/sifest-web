const url = 'https://script.google.com/macros/s/AKfycbzJfiEuqxyBt2uT1mg2ukqgDLtxWsLA2eLgRUYU9m_N6y_EjSe3bBkXZIwvssGGLvfx4w/exec?action=getProdukById&id=PRD-001&token=undefined&t=' + Date.now();
fetch(url).then(r => r.json()).then(data => {
  const dist = data.data.distribusi || [];
  const oldNames = new Set();
  dist.forEach(d => {
    d.items.forEach(i => {
      oldNames.add(i.nama_varian + ' (' + i.id_varian + ')');
    });
  });
  console.log('Dist names:', Array.from(oldNames));

  const newNames = new Set();
  data.data.varian.forEach(v => {
    newNames.add(v.nama_varian + ' (' + v.id_varian + ')');
  });
  console.log('Current names:', Array.from(newNames));
});
