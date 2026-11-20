FROM nginx:1.27-alpine

# Keep local Docker runs aligned with platforms that inject PORT.
ENV PORT=8080
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY . /usr/share/nginx/html
EXPOSE 8080
