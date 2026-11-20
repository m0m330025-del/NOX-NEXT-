FROM nginx:1.27-alpine

# Keep local Docker runs aligned with platforms that inject PORT.
ENV PORT=8080
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template

# Publish only the browser application, never repository metadata, tests, or docs.
COPY *.html *.css *.js /usr/share/nginx/html/
COPY core/ /usr/share/nginx/html/core/

EXPOSE 8080
