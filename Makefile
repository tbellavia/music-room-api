start:
	@docker compose --env-file .env up -d --build

stop:
	@docker compose down

# Creates the dev accounts dev1 / dev2 (password 123, 30-day tokens).
# Any other mode deletes them at startup. Never for the defense.
dev:
	@ENVIRONMENT=dev docker compose --env-file .env up -d --build

lint:
	@npm run lint

lint-fix:
	@npm run lint:fix

# Used when installing new dependencies
build:
	@docker compose build

# End-to-end scripts (scripts/test-*.sh) against the API started in E2E mode:
# verification codes are logged instead of emailed, so the scripts can read them.
# The API is always restarted in normal mode at the end, even if a script fails
# or the run is interrupted (Ctrl+C): E2E mode never stays enabled by mistake.
test-e2e:
	@trap 'echo "Restarting the API in normal mode..."; $(MAKE) --no-print-directory start' EXIT; \
	trap 'exit 130' INT TERM; \
	ENVIRONMENT=test E2E_MODE=true docker compose --env-file .env up -d --build --wait || exit 1; \
	status=0; \
	for script in scripts/test-*.sh; do \
		./$$script || status=1; \
	done; \
	exit $$status

re: stop build start

.PHONY: start stop dev lint lint-fix build re test-e2e
