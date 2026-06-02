# Forge Fit — Architecture & Design Proposal

## 1. Overview

Forge Fit is a health & fitness gamification app that rewards users with XP, levels, and achievements for completing workouts, logging nutrition, and maintaining healthy sleep habits. The goal is to turn daily wellness into a persistent RPG-like progression system.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile / Web Client                     │
│          (React Native / Next.js + Tailwind)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS / WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express.js)                  │
│   Auth (JWT) · Rate Limiting · Request Validation · CORS    │
└─────────┬──────────┬──────────┬──────────┬──────────────────┘
          │          │          │          │
          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
│ Users  │ │ Workout│ │ Nutri  │ │ Sleep      │
│ Service│ │ Service│ │ Service│ │ Service    │
└───┬────┘ └───┬────┘ └───┬────┘ └─────┬──────┘
    │          │          │            │
    └──────────┴──────────┴────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  PostgreSQL          │
              │  + Redis (cache/q)   │
              └─────────────────────┘
```

### 2.1 Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React Native (mobile) / Next.js (web) |
| Backend | Express.js / Node.js |
| Database | PostgreSQL |
| Cache / Queue | Redis |
| Auth | JWT (access + refresh tokens) |
| File Storage | S3-compatible (avatar images) |
| CI/CD | GitHub Actions |

---

## 3. Schema Design

### 3.1 `users`

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  display_name    VARCHAR(100) NOT NULL,
  avatar_url      TEXT,
  xp              INTEGER NOT NULL DEFAULT 0,
  level           INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_xp ON users (xp DESC);
```

### 3.2 `workouts`

```sql
CREATE TABLE workout_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,          -- e.g. "Running", "Push Ups"
  category        VARCHAR(50) NOT NULL,           -- "cardio", "strength", "flexibility"
  base_xp         INTEGER NOT NULL DEFAULT 10,
  icon            VARCHAR(50)
);

CREATE TABLE workouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_type_id UUID NOT NULL REFERENCES workout_types(id),
  duration_minutes INTEGER NOT NULL,
  calories_burned  INTEGER,
  distance_km      DECIMAL(6,2),
  reps             INTEGER,
  sets             INTEGER,
  weight_kg        DECIMAL(5,1),
  xp_earned        INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workouts_user_date ON workouts (user_id, completed_at DESC);
CREATE INDEX idx_workouts_type ON workouts (workout_type_id);
```

### 3.3 `nutrition`

```sql
CREATE TABLE meal_types (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(50) NOT NULL  -- "Breakfast", "Lunch", "Dinner", "Snack"
);

CREATE TABLE food_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  serving_size_g  DECIMAL(7,1),
  calories        INTEGER NOT NULL,
  protein_g       DECIMAL(6,1),
  carbs_g         DECIMAL(6,1),
  fat_g           DECIMAL(6,1),
  fiber_g         DECIMAL(6,1)
);

CREATE TABLE nutrition_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type_id    UUID NOT NULL REFERENCES meal_types(id),
  food_item_id    UUID REFERENCES food_items(id),
  custom_name     VARCHAR(255),                    -- for free-text entries
  serving_qty     DECIMAL(6,2) NOT NULL DEFAULT 1,
  calories        INTEGER NOT NULL,
  protein_g       DECIMAL(6,1),
  carbs_g         DECIMAL(6,1),
  fat_g           DECIMAL(6,1),
  fiber_g         DECIMAL(6,1),
  xp_earned       INTEGER NOT NULL DEFAULT 0,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nutrition_user_date ON nutrition_logs (user_id, logged_at DESC);
```

### 3.4 `sleep`

```sql
CREATE TABLE sleep_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bedtime         TIMESTAMPTZ NOT NULL,
  wake_time       TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (wake_time - bedtime)) / 60
  ) STORED,
  quality_score   SMALLINT CHECK (quality_score BETWEEN 1 AND 10),
  notes           TEXT,
  xp_earned       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sleep_logs_unique_night UNIQUE (user_id, bedtime)
);

CREATE INDEX idx_sleep_user_date ON sleep_logs (user_id, bedtime DESC);
```

### 3.5 `achievements`

```sql
CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) UNIQUE NOT NULL,     -- e.g. "EARLY_BIRD", "MARATHONER"
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  icon            VARCHAR(100),
  category        VARCHAR(50) NOT NULL,             -- "workout", "nutrition", "sleep", "milestone"
  xp_reward       INTEGER NOT NULL DEFAULT 0,
  criteria_type   VARCHAR(50) NOT NULL,             -- "count", "streak", "total", "single"
  criteria_config JSONB NOT NULL DEFAULT '{}'
  -- criteria_config examples:
  -- {"target_count": 30, "workout_type": "Running"}
  -- {"streak_days": 7, "category": "sleep"}
  -- {"total_value": 100000, "unit": "calories"}
);

CREATE TABLE user_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress        JSONB NOT NULL DEFAULT '{}',     -- current progress toward criteria
  unlocked_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements (user_id);
```

### 3.6 `streaks`

```sql
CREATE TABLE streaks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category        VARCHAR(50) NOT NULL,             -- "workout", "nutrition", "sleep"
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

CREATE INDEX idx_streaks_user ON streaks (user_id);
```

---

## 4. API Endpoints

### 4.1 Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account (email, password, display_name) |
| POST | `/api/v1/auth/login` | Login → returns JWT pair |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate refresh token |

### 4.2 Users

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/users/me` | Get own profile + XP, level, stats |
| PATCH | `/api/v1/users/me` | Update display_name, avatar |
| GET | `/api/v1/users/me/stats` | Aggregated stats (weekly/monthly) |
| GET | `/api/v1/users/me/leaderboard` | Leaderboard position + nearby users |

### 4.3 Workouts

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/workouts` | List workouts (filter: date range, type) |
| POST | `/api/v1/workouts` | Log a workout (calculates XP) |
| GET | `/api/v1/workouts/:id` | Get single workout |
| DELETE | `/api/v1/workouts/:id` | Delete workout |
| GET | `/api/v1/workout-types` | List all workout types |

### 4.4 Nutrition

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/nutrition` | List nutrition logs (filter: date range, meal type) |
| POST | `/api/v1/nutrition` | Log a meal entry (calculates XP) |
| DELETE | `/api/v1/nutrition/:id` | Delete entry |
| GET | `/api/v1/food-items` | Search food database |
| POST | `/api/v1/food-items` | Add custom food item |

### 4.5 Sleep

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/sleep` | List sleep logs (filter: date range) |
| POST | `/api/v1/sleep` | Log sleep session (calculates XP) |
| PATCH | `/api/v1/sleep/:id` | Edit sleep log |
| DELETE | `/api/v1/sleep/:id` | Delete sleep log |

### 4.6 Achievements & Streaks

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/achievements` | List all achievements |
| GET | `/api/v1/achievements/mine` | User's achievement progress & status |
| GET | `/api/v1/streaks` | User's current streaks per category |
| GET | `/api/v1/leaderboard` | Global leaderboard (paginated) |

---

## 5. Gamification System

### 5.1 XP Calculation

| Action | Base XP | Bonus |
|---|---|---|
| Complete workout | `duration_min × 2` | +5 if calories > 200, +10 if > 500 |
| Log nutrition | `10` per meal | +5 if macros complete (P/C/F logged) |
| Log sleep | `15` | +10 if quality ≥ 7, +10 if ≥ 8 hours |
| Streak milestone (7d) | `50` | Each subsequent 7d milestone + 50 |
| Achievement unlock | Per-achievement reward | — |

### 5.2 Leveling Formula

```
XP_REQUIRED(level) = 100 × level × 1.5^(level / 10)
```

Level 1 → 2 : 100 XP  
Level 10 → 11 : 1,500 XP  
Level 50 → 51 : 7,500 XP

### 5.3 Achievement Examples

| Code | Name | Criteria | XP |
|---|---|---|---|
| `FIRST_WORKOUT` | First Steps | Complete 1 workout | 25 |
| `WEEK_WARRIOR` | Week Warrior | Complete 7 workouts in 7 days | 100 |
| `MARATHONER` | Marathoner | Log 42.2 km total running | 250 |
| `EARLY_BIRD` | Early Bird | Log sleep before 11 PM for 7 days | 150 |
| `CLEAN_PLATE` | Clean Plate | Log 30 meals with complete macros | 200 |
| `CENTURION` | Centurion | Reach level 100 | 1000 |
| `STREAK_30` | Unstoppable | 30-day workout streak | 500 |

---

## 6. UI Screens (Mobile-First)

### 6.1 Screen Map

```
┌────────────────────────────────────────────────────────────┐
│  Tab Navigator                                              │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌─────────────┐ │
│  │ Home │ │Work- │ │Nutri-  │ │ Sleep  │ │ Achievements│ │
│  │      │ │ outs │ │ tion   │ │        │ │             │ │
│  └──────┘ └──────┘ └────────┘ └────────┘ └─────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 6.2 Screen Details

#### **Home / Dashboard**
- Daily XP summary with animated level progress ring
- Quick-action cards: "Log Workout", "Log Meal", "Log Sleep"
- Active streaks display (fire icon + day count)
- Recent achievements feed (horizontal scroll)
- Today's stats summary (calories, workout minutes, sleep hours)

#### **Workouts**
- **List view**: Calendar-styled, past workouts grouped by day
- **Detail view**: Workout type, duration, calories, notes, map (if running)
- **Log form**: Select type → enter duration / reps / weight / distance → auto XP preview
- **Workout Types** screen: Browse available types with base XP shown

#### **Nutrition**
- **Daily view**: Meals grouped by Breakfast / Lunch / Dinner / Snack
- **Macro ring**: Protein / Carbs / Fat visual breakdown with remaining targets
- **Log form**: Search food (autocomplete) or enter custom → adjust serving → save
- **Food search** screen: Paginated results with nutrition info per 100g

#### **Sleep**
- **Week view**: Bar chart showing each night's duration + quality score
- **Log form**: Set bedtime / wake time (time picker) → quality slider (1-10) → notes
- **Sleep insights**: Average duration, average quality, consistency %, best streak

#### **Achievements**
- **Grid view**: Achievement cards (locked / in-progress / unlocked states)
- **Progress bar** on in-progress cards (e.g. "7 / 30 workouts")
- **Animated unlock** modal on first visit after earning

#### **Profile / Leaderboard**
- Avatar, display name, level, total XP
- Stats snapshots (total workouts, total calories logged, total sleep hours)
- **Leaderboard tab**: Ranked list, top 3 with crown icons, current user highlighted
- **Settings**: Edit profile, notification preferences, logout

---

## 7. Data Flow — XP Award Sequence

```
Client                          Server
  │                                │
  │  POST /workouts {type, dur}   │
  │ ─────────────────────────────► │
  │                                ├── Validate request
  │                                ├── Insert workout row
  │                                ├── Calculate XP (dur × 2 + bonuses)
  │                                ├── UPDATE users SET xp += N
  │                                ├── Check level-up (xp >= threshold?)
  │                                ├── Update workout streak
  │                                ├── Evaluate achievement progress
  │                                │   └── If unlocked → INSERT user_achievement
  │                                │       └── XP reward added to user
  │  201 {workout, xp_earned,     │
  │       level_up?, new_achievs} │
  │ ◄───────────────────────────── │
```

## 8. Cache Strategy (Redis)

| Key Pattern | TTL | Purpose |
|---|---|---|
| `user:{id}:profile` | 5 min | Profile, XP, level |
| `user:{id}:stats:daily` | 1 hour | Today's aggregated stats |
| `leaderboard:global` | 1 min | Ranked user list |
| `streaks:{id}:{cat}` | 10 min | Current streak per category |
| `achievements:all` | 1 hour | Achievement definitions (rarely change) |

## 9. Error Handling Convention

All API errors return a consistent shape:

```json
{
  "error": {
    "code": "WORKOUT_NOT_FOUND",
    "message": "No workout found with the given ID.",
    "details": { "workout_id": "abc-123" }
  }
}
```

HTTP status codes: `200` success, `201` created, `400` validation, `401` auth, `404` not found, `409` conflict, `429` rate limit, `500` server error.

---

## 10. Security

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT access token: 15 min expiry, refresh token: 7 days (stored in DB)
- All endpoints rate-limited per user IP (100 req/min standard, 10 req/min for auth)
- Input validation via **Zod** schemas on every route
- CORS restricted to known client origins
- SQL injection prevented by parameterised queries (PG prepared statements)

---

## 11. Potential Extensions

- **Social features**: Friend system, group challenges, activity feed
- **Wearable integration**: Apple Health / Google Fit / Strava sync
- **Workout plans**: Pre-built programs with daily tasks and XP multipliers
- **Achievement badges**: SVG badge art with rarity tiers (Common → Legendary)
- **Push notifications**: Reminder to log, streak-at-risk alerts, achievement unlocked
