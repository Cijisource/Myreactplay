FROM python:3.11-alpine

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    rm -rf /root/.cache

# Copy application code
COPY docker_stats.py .

# Create output directory
RUN mkdir -p docker_stats_data

# Set the default command
ENTRYPOINT ["python", "docker_stats.py"]
CMD []
