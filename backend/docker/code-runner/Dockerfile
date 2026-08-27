FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip openjdk-17-jdk-headless gcc g++ \
  && npm install -g typescript \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /usr/sbin/nologin runner
WORKDIR /runner
COPY runner.js package.json ./
RUN chown -R runner:runner /runner
USER runner

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "runner.js"]
