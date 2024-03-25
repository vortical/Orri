############################
# Build the application
############################
FROM node:20 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

############################
# Set up the production environment
############################
FROM nginx:stable-alpine

ARG BASEURL_PATH
# # Create a non-privileged user that the app will run under.
# # See https://docs.docker.com/go/dockerfile-user-best-practices/
# ARG UID=10001
# RUN adduser \
#     --disabled-password \
#     --gecos "" \
#     --home "/nonexistent" \
#     --shell "/sbin/nologin" \
#     --no-create-home \
#     --uid "${UID}" \
#     appuser

#  # swith to the non-privileged user to run the application.

# USER appuser
RUN mkdir -p /app/dist /usr/share/nginx/html/${BASEURL_PATH}
COPY --from=builder /app/dist /usr/share/nginx/html/${BASEURL_PATH}
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf


EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]