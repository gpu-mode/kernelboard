import os
import multiprocessing

PORT = int(os.getenv('PORT', 443))

# Server socket
bind = f"0.0.0.0:{PORT}"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 100
timeout = 30
keepalive = 2

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Process naming
proc_name = 'kernelboard' 
