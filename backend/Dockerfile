FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends g++ gcc && \
    rm -rf /var/lib/apt/lists/*

# Create directory for database with correct permissions
RUN mkdir -p /data && chmod a+rwx /data

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--reload"]