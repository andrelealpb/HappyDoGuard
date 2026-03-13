FROM tiangolo/nginx-rtmp:latest

COPY nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /data/hls /data/recordings

EXPOSE 1935 8080

CMD ["nginx", "-g", "daemon off;"]
