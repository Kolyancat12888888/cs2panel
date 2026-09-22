.PHONY: build up down logs daemon backend frontend test

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

daemon-build:
	cd daemon && go build -o cs2-daemon main.go

frontend-dev:
	cd frontend && npm run dev

backend-serve:
	cd backend && php artisan serve
