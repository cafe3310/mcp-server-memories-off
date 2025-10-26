import { getEnvVar } from './utils.js';

// This is the main entry point. It reads the MEM_VERSION environment variable
// to decide whether to launch the v1 or v2 implementation of the server.

const version = getEnvVar('MEM_VERSION', '1');

if (version === '2') {
    console.log('Booting v2 server...');
    import('./v2/index.js')
        .then(v2 => v2.runV2())
        .catch(error => {
            console.error('Failed to run v2 server:', error);
            process.exit(1);
        });
} else {
    console.log('Booting v1 server...');
    import('./v1/index.js');
}