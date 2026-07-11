FROM python:3.13-slim

LABEL maintainer="d31337m3" \
      description="d31337m3 Node Agent - lightweight peer for the Sp1d3r network"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py .

RUN useradd -m -r -s /bin/bash nodeagent && \
    mkdir -p /data && chown nodeagent:nodeagent /data

USER nodeagent

VOLUME ["/data"]

ENV CITYHALL_URL=http://host.docker.internal:8000 \
    SP1D3R_URL=http://host.docker.internal:9000 \
    DIRECTOR_URL=http://host.docker.internal:8400 \
    AGENT_DATA_DIR=/data \
    HEARTBEAT_INTERVAL=30 \
    SYNC_INTERVAL=60

CMD ["python", "-u", "agent.py"]
