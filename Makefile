.PHONY: dev frontend backend

dev:
	@set -e; \
	trap 'kill 0' INT TERM EXIT; \
	npm run backend:dev & \
	npm run frontend:dev & \
	wait

frontend:
	npm run frontend:dev

backend:
	npm run backend:dev