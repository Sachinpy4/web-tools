module.exports = {
  apps: [
    {
      name: 'web-tools-api',
      script: 'dist/main.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Memory and CPU limits
      max_memory_restart: '1G',
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      // Auto restart
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'web-tools-worker',
      script: 'dist/worker.js',
      instances: 1, // Usually one worker instance
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // Memory limits
      max_memory_restart: '512M',
      // Logging
      log_file: './logs/worker-combined.log',
      out_file: './logs/worker-out.log',
      error_file: './logs/worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      // Auto restart
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    }
  ]
}; 