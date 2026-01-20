FROM python:3.12-slim AS build

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

FROM python:3.12-slim

WORKDIR /app

COPY --from=build /install /usr/local

COPY . .

RUN rm -rf tests docs *.log

USER 1000:1000

EXPOSE 8999

CMD ["uvicorn", "jan_zizka.asgi:application", "--host", "0.0.0.0", "--port", "8999"]
