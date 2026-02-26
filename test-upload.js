const fs = require('fs');

const date = new Date().toISOString().split('T')[0];
// Format for CSV: Feb 26 2026 09:02 AM
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const d = new Date();
const formattedDate = `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`;

const csv = `Site | Location Name | Name | Card Id | Batch | Roll No | Provisional Roll No | Swipe TIme | Swipe Type | Error Code | Pull Time | Geo Location | Controller Name
S.P. Jain Institute of Management & Research - Mumbai | LOC_SPJMUM | Aarav Sharma | 1001 | PGDM 2025-27 | PGP-25-001 | | ${formattedDate} 08:30 AM | In | Success | ${formattedDate} 03:15 PM | SPJIMR Campus | Con1`;

fs.writeFileSync('test-today.csv', csv);

(async () => {
  const formData = new FormData();
  const blob = new Blob([fs.readFileSync('test-today.csv')], { type: 'text/csv' });
  formData.append('file', blob, 'test-today.csv');
  
  try {
    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Cookie': 'session={"id": 999, "role": "programme_office", "name": "Admin"}'
      },
      body: formData
    });
    console.log(await res.json());
  } catch (e) {
    console.error(e);
  }
})();
