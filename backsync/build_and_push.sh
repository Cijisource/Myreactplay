#!/usr/bin/env bash
# Build the fetcher and dashboard images and push them to Docker Hub.
# Usage: DOCKERHUB_USER=myuser ./build_and_push.sh [tag]
set -euo pipefail

cd "$(dirname "$0")"

DOCKERHUB_USER="${DOCKERHUB_USER:?Set DOCKERHUB_USER to your Docker Hub username}"
TAG="${1:-latest}"

FETCHER_IMAGE="${DOCKERHUB_USER}/blynk-fetcher"
DASHBOARD_IMAGE="${DOCKERHUB_USER}/blynk-dashboard"

# Log in only when a token is supplied; otherwise rely on an existing `docker login`.
if [[ -n "${DOCKERHUB_TOKEN:-}" ]]; then
  echo "${DOCKERHUB_TOKEN}" | docker login -u "${DOCKERHUB_USER}" --password-stdin
fi

echo "Building ${FETCHER_IMAGE}:${TAG}"
docker build -f Dockerfile -t "${FETCHER_IMAGE}:${TAG}" .

echo "Building ${DASHBOARD_IMAGE}:${TAG}"
docker build -f Dockerfile.streamlit -t "${DASHBOARD_IMAGE}:${TAG}" .

if [[ "${TAG}" != "latest" ]]; then
  docker tag "${FETCHER_IMAGE}:${TAG}" "${FETCHER_IMAGE}:latest"
  docker tag "${DASHBOARD_IMAGE}:${TAG}" "${DASHBOARD_IMAGE}:latest"
fi

docker push "${FETCHER_IMAGE}:${TAG}"
docker push "${DASHBOARD_IMAGE}:${TAG}"

if [[ "${TAG}" != "latest" ]]; then
  docker push "${FETCHER_IMAGE}:latest"
  docker push "${DASHBOARD_IMAGE}:latest"
fi

echo "Pushed:"
echo "  ${FETCHER_IMAGE}:${TAG}"
echo "  ${DASHBOARD_IMAGE}:${TAG}"
