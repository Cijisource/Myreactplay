#!/bin/sh

# List of images with tags
images="
555cijaiz555/rfront:v7
555cijaiz555/rback:v7
"

# Loop through and push each image in background
for image in $images; do
  echo "🚀 Pushing $image..."
  (
    if docker push "$image"; then
      echo "✅ Successfully pushed $image"
    else
      echo "❌ Failed to push $image"
    fi
  ) &
done

# Wait for all background jobs to finish
wait
echo "🎉 All pushes completed!"