module.exports = {
  apps: [
    {
      name: 'ecommerse-nest-backend',
      script: './dist/src/main.js',
      instances: 1, 
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};