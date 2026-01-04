#!/bin/sh
set -e

# Check if API_KEY environment variable is set
if [ -z "$API_KEY" ]; then
    echo "Warning: API_KEY environment variable is not set."
else
    echo "Injecting API_KEY into index.html..."
    # Use sed to replace the placeholder with the actual API key
    # We use a different delimiter (|) to avoid issues if the key contains slashes
    sed -i "s|RUNTIME_API_KEY_PLACEHOLDER|$API_KEY|g" /usr/share/nginx/html/index.html
fi

# Execute the CMD passed to the container (default: nginx -g "daemon off;")
exec "$@"
