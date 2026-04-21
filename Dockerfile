FROM python:3.10-slim

WORKDIR /app

# install system deps
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*

# install python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy project
COPY . .

# expose port
EXPOSE 8000

# run your API
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]