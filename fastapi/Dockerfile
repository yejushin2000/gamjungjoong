FROM python:3.10-slim

COPY . .

RUN pip install --no-cache-dir --upgrade -r requirements.txt

CMD ["python", "-m", "uvicorn", "fastAPI:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]