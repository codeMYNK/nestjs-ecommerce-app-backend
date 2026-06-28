// module.exports = {
//   apps: [
//     {
//       name: 'ecommerse-nest-backend',
//       script: './dist/src/main.js',
//       instances: 1, 
//       exec_mode: 'fork',
//       env: {
//         NODE_ENV: 'production',
//       },
//     },
//   ],
// };



const os = require('os');

// 1. Check if Render is forcing a process limit (WEB_CONCURRENCY)
// 2. If not, fallback to physical CPU cores
const totalCores = process.env.WEB_CONCURRENCY ? parseInt(process.env.WEB_CONCURRENCY) : os.cpus().length;

console.log("Available Cores (Adjusted): ", totalCores);

module.exports = {
  apps: [
    {
      name: 'ecommerse-nest-backend',
      script: './dist/src/main.js',
      
      // If totalCores evaluates to 1, use 1 instance. Otherwise use 'max'
      instances: totalCores === 1 ? 1 : 'max', 
      
      // If totalCores evaluates to 1, use 'fork'. Otherwise use 'cluster'
      exec_mode: totalCores === 1 ? 'fork' : 'cluster',
      
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};