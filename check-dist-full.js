const url = 'https://script.google.com/macros/s/AKfycbzJfiEuqxyBt2uT1mg2ukqgDLtxWsLA2eLgRUYU9m_N6y_EjSe3bBkXZIwvssGGLvfx4w/exec?action=getProdukById&id=PRD-001&token=undefined&t=' + Date.now();
fetch(url).then(r => r.json()).then(data => {
  console.log(JSON.stringify(data.data.distribusi, null, 2));
});
