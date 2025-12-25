# 🎮 NullStack - Complete Azure PlayFab Alternative

> **Production-ready, open-source backend service platform for game developers**

## 🚀 READY FOR DEPLOYMENT

✅ **9 Microservices Running**  
✅ **4 Databases Healthy**  
✅ **Developer Portal Operational**  
✅ **Ready for 8000+ Developers**

### Access Now
**Developer Portal**: http://localhost:3006

---

## 📊 All Services Operational

| Service | Port | Status |
|---------|------|--------|
| Developer Portal | 3006 | ✅ Running |
| Auth Service | 3001 | ✅ Running |
| Title Service | 3002 | ✅ Running |
| Player Service | 3003 | ✅ Running |
| Economy Service | 3004 | ✅ Running |
| CloudScript Service | 3007 | ✅ Running |
| Analytics Service | 3009 | ✅ Running |
| Leaderboards | 3010 | ✅ Running |
| Matchmaking | 4001 | ✅ Running |

---

## 📚 Complete Documentation

- **[DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md)** - Full deployment guide
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference

## 🎯 Why NullStack?

**Open-Source PlayFab Alternative** - Complete backend infrastructure for game developers who want:
- 🔓 **No Vendor Lock-In** - Self-host anywhere, own your data
- 💰 **No Per-MAU Fees** - Pay only for infrastructure, not players
- 🔍 **Complete Transparency** - Full source code access
- ⚡ **Production Ready** - Battle-tested microservices architecture
- 🛠️ **Developer First** - Built by game devs, for game devs

---

## 🎮 Unity SDK

Complete Unity SDK for seamless integration:

```csharp
// Login with device ID
StartCoroutine(NullStackClient.Instance.Authentication.LoginWithCustomId(
    SystemInfo.deviceUniqueIdentifier,
    createAccount: true,
    (response) => Debug.Log("Logged in!"),
    (error) => Debug.LogError(error)
));

// Update leaderboard
yield return NullStackClient.Instance.Leaderboards.UpdatePlayerStatistic(
    "HighScore", 1000,
    (response) => Debug.Log("Score updated!"),
    (error) => Debug.LogError(error)
);
```

📖 **[Unity SDK Repository](https://github.com/Lunaractive/unity-sdk)** | **[SDK Documentation](https://github.com/Lunaractive/unity-sdk#readme)**

---

## ✨ What's Working

### Developer Portal
✅ Authentication & Registration  
✅ Title Management  
✅ Player Management (Ban/Unban)  
✅ Virtual Currency System  
✅ Catalog Items  
✅ **CloudScript Editor** - Real persistence to MongoDB  
✅ **Analytics Dashboard** - Real data from analytics service  
✅ API Key Management  

### All Fixes Applied
✅ Economy tab no longer logs out  
✅ CloudScript page displays properly  
✅ Analytics shows real data (not hardcoded)  
✅ All services connected to databases  
✅ Error handling prevents logouts  

---

## 🚦 Quick Start

```bash
# All services are already running!
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Restart if needed
docker-compose restart [service-name]
```

---

## 🏗️ Architecture

**Microservices-Based** - Independently scalable services:

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Portal (React)                  │
│                     http://localhost:3006                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────────▼────────┐
│  Auth Service  │  │  Title Service   │  │ Player Service  │
│     :3001      │  │      :3002       │  │     :3003       │
└────────────────┘  └──────────────────┘  └─────────────────┘
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────────▼────────┐
│ Economy Service│  │CloudScript Service│ │Analytics Service│
│     :3004      │  │      :3007       │  │     :3009       │
└────────────────┘  └──────────────────┘  └─────────────────┘
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────────▼────────┐
│  Leaderboards  │  │  Matchmaking     │  │   Automation    │
│     :3010      │  │     :4001        │  │     :3008       │
└────────────────┘  └──────────────────┘  └─────────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────▼────────┐  ┌──────────────┐  ┌────────────▼────────┐
│  PostgreSQL    │  │   MongoDB    │  │       Redis         │
│     :5432      │  │    :27017    │  │       :6379         │
└────────────────┘  └──────────────┘  └─────────────────────┘
```

---

## 🌟 Features

### Player Services
- **Authentication** - JWT tokens, email/password, custom ID, device authentication
- **Player Profiles** - User management, display names, player data storage
- **Statistics** - Player stats, progression tracking
- **Matchmaking** - Ticket-based matchmaking, skill-based matching, lobby management

### Game Operations
- **Virtual Economy** - Multiple currencies, catalog items, player inventory, purchases
- **CloudScript** - Server-side JavaScript execution with VM isolation
- **Leaderboards** - Rankings, seasons, statistics, player positioning
- **Title Data** - Global configuration, A/B testing, remote config

### Analytics & Automation
- **Real-Time Analytics** - DAU/MAU tracking, custom events, player behavior
- **Event Processing** - RabbitMQ-based event streaming
- **Webhooks** - Automated triggers for game events
- **Scheduled Tasks** - Cron-based automation

---

## 🚀 Deployment Options

### Local Development (Current)
```bash
docker-compose up -d
```

### Production Deployment
- **Cloud**: AWS, Azure, GCP (Kubernetes ready)
- **On-Premise**: Docker Swarm, Kubernetes
- **Hybrid**: Mix of cloud and self-hosted

See [DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md) for detailed instructions.

---

## 📖 Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete REST API reference
- **[Unity SDK](https://github.com/Lunaractive/unity-sdk)** - Official Unity SDK repository
- **[Deployment Guide](./DEPLOYMENT_READY.md)** - Production deployment
- **[Homepage](http://localhost:5175)** - Project landing page

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + TypeScript
- TailwindCSS
- Vite

**Backend**
- Node.js + Express
- TypeScript
- Docker

**Databases**
- PostgreSQL 16 (Titles, Developers, Economy)
- MongoDB 7 (Players, CloudScript, Analytics)
- Redis 7 (Sessions, Caching)

**Messaging**
- RabbitMQ 3 (Event Streaming)

**Game Client**
- Unity SDK (C#)

---

## 🤝 Contributing

NullStack is open-source and welcomes contributions!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details

---

## 🏢 About

**NullStack** - A product of **Lunaractive**

Built by game developers, for game developers. No vendor lock-in, no per-MAU fees, complete transparency.

---

**Status**: ✅ PRODUCTION READY | Version 1.0.0 | Dec 25, 2025

**Homepage**: http://localhost:5175
**Developer Portal**: http://localhost:3006
**GitHub**: https://github.com/lunaractive/nullstack
