#!/bin/bash

# List of images with tags
images=(
  "555cijaiz555/rfront:v7"
  "555cijaiz555/rback:v7"
)

docker push 555cijaiz555/rfront:v7 & docker push 555cijaiz555/rback:v7

# Loop through and push each image
# for image in "${images[@]}"; do
#   echo "Pushing $image..."
#   docker push "$image"
  
#   if [ $? -eq 0 ]; then
#     echo "Successfully pushed $image"
#   else
#     echo "Failed to push $image"
#   fi
# done