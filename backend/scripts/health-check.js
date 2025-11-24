const http = require('http');

// Détermine le port à tester :
// - en développement: 3033 (port local du backend)
// - sinon: PORT ou 3001 par défaut
const defaultPort =
  process.env.NODE_ENV === 'development'
    ? 3033
    : Number(process.env.PORT || 3001);

const port = Number(process.env.HEALTH_PORT || defaultPort);
const url = `http://localhost:${port}/api/health`;

http
  .get(url, (res) => {
    const { statusCode } = res;
    if (statusCode >= 200 && statusCode < 400) {
      console.log(`✅ Health check OK sur ${url} (status ${statusCode})`);
      process.exit(0);
    } else {
      console.error(`❌ Health check KO sur ${url} (status ${statusCode})`);
      process.exit(1);
    }
  })
  .on('error', (err) => {
    console.error(`❌ Health check impossible sur ${url}: ${err.message}`);
    process.exit(1);
  });




