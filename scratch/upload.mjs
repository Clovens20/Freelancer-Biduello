import fs from 'fs';
import path from 'path';

async function upload() {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('userhash', '');
  const fileBuffer = fs.readFileSync('assets/biduello.jpg');
  const fileBlob = new Blob([fileBuffer], { type: 'image/jpeg' });
  formData.append('fileToUpload', fileBlob, 'biduello.jpg');
  try {
    const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: formData });
    const url = await res.text();
    console.log('UPLOADED URL:', url);
  } catch (e) { console.error('Error:', e); }
}
upload();
