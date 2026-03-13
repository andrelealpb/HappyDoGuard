FROM jrottenberg/ffmpeg:6-alpine

WORKDIR /app

COPY record.sh .
RUN chmod +x record.sh

VOLUME /data/recordings

ENTRYPOINT ["/bin/sh"]
