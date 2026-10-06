const url = 'https://script.google.com/macros/s/AKfycbzJfiEuqxyBt2uT1mg2ukqgDLtxWsLA2eLgRUYU9m_N6y_EjSe3bBkXZIwvssGGLvfx4w/exec?action=getProdukById&id=PRD-001&token=undefined&t=' + Date.now();
fetch(url, { redirect: 'manual' })
.then(r => {
  console.log('Status:', r.status);
  console.log('Headers:');
  for (const [key, value] of r.headers.entries()) {
    console.log(key + ':', value);
  }
})
.catch(console.error);
