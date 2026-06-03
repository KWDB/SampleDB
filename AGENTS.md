# SampleDB Repository Guide

## Repository Overview

KWDB SampleDB - Demo repository for KWDB multi-modal database (relational + time-series). Contains example scripts and a full-stack smart-meter web application.

## Key Structure

```
sampledb/
├── smart-meter-web/     # Full-stack web app (React + Express)
├── smart-meter/         # Smart meter example with pre-built data
├── multi-mode/          # Cross-model query examples
├── window/              # Window function examples
├── aggregate/           # Aggregate function examples
└── .claude/skills/      # Agent skills for demos
```

## Critical Commands

### Smart-Meter-Web Application

```bash
# Development (frontend + backend separate)
cd smart-meter-web
npm run install-all    # Install all dependencies
npm run dev            # Start both servers (frontend:5173, backend:3001)

# Production (merged)
npm run build:production  # Build frontend + start merged server
npm run start:production  # Start merged server on port 3001

# Single commands
cd smart-meter-web/server && npm start   # Backend only
cd smart-meter-web/client && npm run dev # Frontend only
```

### Example Scripts (Container Mode)

```bash
# All examples follow this pattern
cd <example-dir>
bash create_load.sh --container <container_name> --port 26257
bash query.sh --container <container_name> --port 26257

# One-click scripts
bash smart_meter_test.sh --container <container_name>
bash multi_test.sh --container <container_name>
bash window_test.sh --container <container_name>
bash aggregate_test.sh --container <container_name>
```

### Example Scripts (Host Mode)

```bash
# Requires kwbase binary in PATH or specify path
bash <example>/create_load.sh --host 127.0.0.1 --port 11223 --kwbase-bin ./kwbase
bash <example>/query.sh --host 127.0.0.1 --port 11223 --kwbase-bin ./kwbase
```

## Architecture Notes

### KWDB Multi-Modal Database
- **Relational (rdb)**: `meter_info`, `user_info`, `area_info`, `alarm_rules`
- **Time-series (tsdb)**: `meter_data` with tags and primary tags
- **Cross-model**: JOIN between relational metadata and time-series measurements

### Smart-Meter-Web Stack
- **Frontend**: React 18 + Ant Design + ECharts + Vite
- **Backend**: Express + PostgreSQL driver (KWDB is PostgreSQL-compatible)
- **Build**: Vite with manual chunks (vendor, antd, charts, react-query)
- **Dev proxy**: Vite proxies `/api` to backend on port 3001

### Shell Script Architecture
- `kwdb_common.sh`: Shared functions for container/host mode detection
- All scripts support `--container <name>` or `--host <host>` flags
- Data imports use `nodelocal://1/...` paths (KWDB store directory)

## Development Gotchas

### Smart-Meter-Web
- **Port conflicts**: Frontend dev runs on 5173/5174, backend on 3001
- **Environment**: Copy `server/.env.example` to `server/.env` before starting
- **Database required**: App needs KWDB running with `rdb` and `tsdb` databases
- **Build context**: Dockerfile expects `../smart-meter/extern/` data files

### Example Scripts
- **Container name required**: Must specify running KWDB container
- **Data preparation**: Some examples need `prepare_data.sh` or `generate_data.sh` first
- **Database cleanup**: Scripts may DROP and recreate demo databases
- **Port defaults**: Host mode uses 11223 (SQL) and 8892 (HTTP), container uses 26257/8080

### Docker Builds
- **Multi-stage**: Client builder → Server builder → Data import → Final image
- **Data files**: Requires `smart-meter/extern/rdb.tar.gz` and `tsdb.tar.gz`
- **Build context**: Must run from `smart-meter-web/` directory with `..` as context

## Agent Skills

Available in `.claude/skills/` and `.agents/skills/`:
- `sampledb-quickstart`: Interactive demo walkthrough
- `kwdb-install-deploy`: KWDB installation guidance
- `kwdb-text2sql-aiot`: Natural language to KWDB SQL
- `kwdb-intelligent-inspection`: Database health checks

## Verification Commands

```bash
# Check KWDB connection
kwbase sql --insecure --host=localhost:26257 -e "SELECT 1;"

# Verify example data
kwbase sql --insecure --host=localhost:26257 -d rdb -e "SHOW TABLES;"
kwbase sql --insecure --host=localhost:26257 -d tsdb -e "SHOW TABLES;"

# Smart-meter-web health check
curl http://localhost:3001/api/health

# Docker container status
docker ps --filter "name=smart-meter" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
