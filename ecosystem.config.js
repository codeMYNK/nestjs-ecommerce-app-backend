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

// Automatically check how many CPU cores the machine has
const totalCores = os.cpus().length;
console.log("Available Cores: ",totalCores);

module.exports = {
  apps: [
    {
      name: 'ecommerse-nest-backend',
      script: './dist/src/main.js',
      
      // 👇 AUTOMATIC ADJUSTMENT LOGIC
      // If 1 core (Render Free Tier), use 1 instance. 
      // If multi-core (Paid Tier), use all available cores ('max')!
      instances: totalCores === 1 ? 1 : 'max', 
      
      // Automatically switch to 'cluster' mode only if there are multiple cores
      exec_mode: totalCores === 1 ? 'fork' : 'cluster',
      
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};