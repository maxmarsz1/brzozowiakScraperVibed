# 🚗 Brzozowiak Intelligence

A real-time automotive market scraper and intelligence platform. Automatically scrapes car listings, tracks new offers, and provides a rich filtering and search interface.

---

## Features

- 🔍 **Advanced Filtering** — brand, year range, price range, mileage, fuel type
- 🆕 **New Offer Tracking** — unseen listings are highlighted with a pulsing badge
- ❤️ **Favorites** — bookmark offers you're interested in
- 💾 **Saved Searches** — save filter presets with live "new offer" counters
- 🖼️ **Grid / List View** — switch between card and compact list layouts
- 📄 **Offer Modal** — detailed view with full description and equipment list
- 🔄 **Auto Scraper** — background process continuously fetches new listings

---

## Running with Docker (Recommended)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd brzozowiakApp
```

### 2. (First time only) Migrate your existing database into the Docker volume

If you have an existing `db.sqlite3` you want to keep:

```bash
docker compose run --rm backend sh -c "cp /app/db.sqlite3 /data/db.sqlite3"
```

If starting fresh, skip this — migrations run automatically on first start.

### 3. Start all services

```bash
docker compose up
```

Or in the background:

```bash
docker compose up -d
```

### 4. Open the app

The URL depends on your configuration in the `.env` file (see [Configuration](#configuration) below).

| Mode | Service | URL |
|------|---------|-----|
| **Development** (default) | Frontend (Vite Dev) | http://localhost:5173 |
| **Production (Django)** | Fullstack | http://localhost:8000 |
| **Production (Vite)** | Frontend (Nginx) | http://localhost:3000 |

### 5. Updating the project

Use the provided script to pull latest changes and rebuild:

```bash
./update_project.sh
```

### Stop everything

```bash
docker compose down
```

### Stop and delete the database volume

```bash
docker compose down -v
```

---

## Running Locally (without Docker)

### Prerequisites

- Python 3.12+
- Node.js 20+

### Backend

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Start the Django development server
python manage.py runserver
```

Backend will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

Frontend will be available at `http://localhost:5173`.

### Scraper

In a separate terminal (with venv activated):

```bash
python manage.py run_scraper
```

The scraper runs continuously and fetches new listings in the background.

---

## Project Structure

```
brzozowiakApp/
├── core/                   # Django project settings & URLs
├── scraper/                # Django app: models, views, API, scraper
│   ├── models.py           # Offer, SavedSearch models
│   ├── views.py            # REST API viewsets & filters
│   ├── serializers.py      # DRF serializers
│   └── management/
│       └── commands/
│           └── run_scraper.py   # Background scraper command
├── frontend/               # Vite + React frontend
│   ├── src/
│   │   ├── App.jsx         # Main dashboard with filters & offer grid
│   │   └── OfferDetails.jsx # Offer detail modal
│   ├── Dockerfile
│   └── vite.config.js
├── Dockerfile.backend
├── docker-compose.yml
├── entrypoint.sh           # Auto-runs migrations before server start
└── requirements.txt
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/offers/` | List offers with filtering & pagination |
| `POST` | `/api/offers/{id}/mark_seen/` | Mark an offer as seen |
| `POST` | `/api/offers/{id}/toggle_favorite/` | Toggle favorite status |
| `GET` | `/api/saved_searches/` | List saved searches with new-offer counts |
| `POST` | `/api/saved_searches/` | Create a saved search |
| `DELETE` | `/api/saved_searches/{id}/` | Delete a saved search |

### Offer Filters (query params)

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Full-text search across title, description, location |
| `brand` | string | Filter by brand |
| `fuel` | string | Filter by fuel type |
| `year_min` / `year_max` | integer | Production year range |
| `price_min` / `price_max` | integer | Price range (PLN) |
| `mileage_min` / `mileage_max` | integer | Mileage range (km) |
| `is_seen` | boolean | Filter by seen status |
| `is_favorite` | boolean | Filter favorites only |
| `has_price` | boolean | Exclude listings without a price |
| `ordering` | string | Sort field (e.g. `-created_at`, `price_num`, `year_num`) |

---

## Configuration

The project uses a `.env` file for configuration. Copy the settings and modify as needed.

### Production Modes

You can choose how the frontend is served in production by setting `FRONTEND_MODE` in `.env`:

| Mode | Value | Description |
|------|-------|-------------|
| **Django** | `django` | Django serves the built frontend files via WhiteNoise. Best for simple deployments. |
| **Vite** | `vite` | A separate Nginx container serves the frontend and proxies API calls to the backend. |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_MODE` | `django` | `django` or `vite` (Production only) |
| `DJANGO_DEBUG` | `False` | Enable debug mode (set to `True` for development) |
| `DJANGO_SECRET_KEY` | (required) | Django secret key for production |
| `DJANGO_ALLOWED_HOSTS` | `localhost 127.0.0.1` | Allowed hosts for Django |
| `BACKEND_PORT` | `8000` | Port for the Django backend |
| `FRONTEND_PORT` | `3000` | Port for the Nginx frontend (Vite mode only) |
| `VITE_API_URL` | `http://localhost:8000` | API URL for the frontend |

---

## Development Mode

To run in development mode with hot-reloading:

1. Set `DJANGO_DEBUG=True` in `.env`.
2. Run `docker compose --profile dev up`.
3. Frontend will be on `http://localhost:5173`.
4. Backend will be on `http://localhost:8000`.
