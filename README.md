<<<<<<< HEAD
# Solviaa
=======

>>>>>>> slm_10

Plateforme web de recouvrement pour PME   suivi des échéances, impayés, relances et scoring de risque.

**Production :** [https://solviaa.vercel.app](https://solviaa.vercel.app)

## Production

**[https://solviaa.vercel.app](https://solviaa.vercel.app)** — guide de mise en prod : [docs/12-production-first-setup.md](./docs/12-production-first-setup.md)

## Documentation

La documentation complète du projet se trouve dans le dossier **[`docs/`](./docs/README.md)** :

- [Vue d'ensemble](./docs/01-overview.md)
- [Architecture](./docs/02-architecture.md)
- [Installation & config](./docs/03-setup.md)
- [Déploiement Vercel](./docs/04-deployment.md)
- [Base de données](./docs/05-database.md)
- [API REST](./docs/06-api.md)
- [Modules métier](./docs/07-modules.md)
- [Auth & RBAC](./docs/08-auth-rbac.md)
- [Sécurité](./docs/09-security.md)
- [UI & Design](./docs/10-ui-design.md)

## Démarrage rapide

```bash
cp .env.example .env.local
npm install
npx prisma migrate deploy
npm run dev
```

Voir [docs/03-setup.md](./docs/03-setup.md) pour la configuration détaillée.

## Stack

Next.js 15 · TypeScript · Prisma · Supabase · Vercel · Tailwind · shadcn/ui
