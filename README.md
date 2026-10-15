# comu — version 1 : page publique + admin (prix et apparence)

## 1. Mettre le code sur GitHub
1. Dézippe ce dossier sur ton Mac.
2. Ouvre ton dépôt `comu` sur github.com > « uploading an existing file ».
3. Glisse-y TOUT le contenu du dossier (app, lib, public, package.json…), pas le dossier lui-même.
4. En bas, « Commit changes ».

## 2. Mettre en ligne avec Netlify (gratuit)
1. Crée un compte sur netlify.com (avec GitHub).
2. « Add new site » > « Import an existing project » > GitHub > choisis `comu`.
3. Avant de déployer, ouvre « Environment variables » et ajoute :
   - NEXT_PUBLIC_SUPABASE_URL = l'URL de ton projet Supabase
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = ta clé « anon » ou « publishable »
   (jamais la clé « secret » ou « service_role »)
4. « Deploy ». Ton site apparaît sur une adresse en .netlify.app.
5. Ton admin est sur ton-adresse/admin (connexion avec l'email du compte Supabase).
