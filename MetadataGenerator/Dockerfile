FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install -r requirements.txt

# Copy code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run command
CMD ["python", "create_metadata.py"]