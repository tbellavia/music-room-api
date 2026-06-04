start:
	@docker compose --env-file .env up -d --build

stop:
	@docker compose down

lint:
	@npm run lint

lint-fix:
	@npm run lint:fix

# Used when installing new dependencies
build:
	@docker compose build

re: stop build start
