FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

RUN npm run build

FROM node:24-alpine
RUN npm install -g serve
RUN adduser -D appuser
WORKDIR /app
COPY --chown=appuser:appuser --from=builder /app/dist ./dist
USER appuser
EXPOSE 3100
CMD ["serve", "-s", "dist", "-l", "3100"]
