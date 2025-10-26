console.error('Booting v2 server...');
import('./v2/index.js')
  .then(v2 => v2.runV2())
  .catch(error => {
    console.error('Failed to run v2 server:', error);
    process.exit(1);
  });