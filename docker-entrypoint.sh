#!/bin/sh
set -e

# Check if API_KEY environment variable is set
if [ -z "$API_KEY" ]; then
    echo "Warning: API_KEY (Gemini) environment variable is not set."
else
    echo "Injecting Gemini API_KEY into index.html..."
    # Use sed to replace the placeholder with the actual API key
    # We use a different delimiter (|) to avoid issues if the key contains slashes
    sed -i "s|RUNTIME_API_KEY_PLACEHOLDER|$API_KEY|g" /usr/share/nginx/html/index.html
fi

# Check if TANDOOR_API_KEY environment variable is set
if [ -z "$TANDOOR_API_KEY" ]; then
    echo "Warning: TANDOOR_API_KEY environment variable is not set."
else
    echo "Injecting TANDOOR_API_KEY into index.html..."
    sed -i "s|RUNTIME_TANDOOR_API_KEY_PLACEHOLDER|$TANDOOR_API_KEY|g" /usr/share/nginx/html/index.html
fi

# Inject TANDOOR_ORIGIN into nginx.conf
if [ -z "$TANDOOR_ORIGIN" ]; then
    echo "Warning: TANDOOR_ORIGIN environment variable is not set. Tandoor proxy will not work."
    # Set a dummy value to prevent nginx from failing to start
    export TANDOOR_ORIGIN="http://localhost:8080"
else
    echo "Configuring Tandoor proxy to: $TANDOOR_ORIGIN"
fi

# Use envsubst to substitute environment variables in nginx config
# We only substitute $TANDOOR_ORIGIN to avoid affecting other nginx variables
envsubst '$TANDOOR_ORIGIN' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the CMD passed to the container (default: nginx -g "daemon off;")
exec "$@"
