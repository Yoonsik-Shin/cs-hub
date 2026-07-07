import fs from 'fs';
import http from 'http';

// 백엔드 컨테이너 혹은 로컬 백엔드 서버의 OpenAPI Spec JSON 주소
const SPEC_URL = process.env.BACKEND_API_URL || 'http://localhost:8080/v3/api-docs';
const OUTPUT_PATH = './openapi/swagger.json';

console.log(`[INFO] Fetching OpenAPI spec from: ${SPEC_URL}...`);

http.get(SPEC_URL, (res) => {
  if (res.statusCode !== 200) {
    console.error(`[ERROR] Failed to fetch spec. Status Code: ${res.statusCode}`);
    process.exit(1);
  }

  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      // JSON 포맷 유효성 확인
      const parsed = JSON.parse(data);
      
      // JSON 미려하게 포맷팅하여 저장
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
      console.log(`[SUCCESS] OpenAPI spec updated successfully at: ${OUTPUT_PATH}`);
    } catch (err) {
      console.error('[ERROR] Downloaded data is not valid JSON. Response might be an HTML error page.');
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error(`[ERROR] Connection failed. Is backend server running? ${err.message}`);
  process.exit(1);
});
