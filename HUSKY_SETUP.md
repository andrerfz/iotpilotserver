# 🐶 Configuración de Husky

Husky está configurado en `app/package.json` pero necesitas inicializarlo.

## Paso 1: Instalar dependencias

```bash
cd app
npm install
```

## Paso 2: Inicializar Husky

```bash
npx husky init
```

## Paso 3: Crear hook pre-commit

```bash
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."
echo ""

cd app || exit 1

echo "📝 Linting code..."
npm run lint || {
    echo "❌ Linting failed! Please fix errors before committing."
    exit 1
}

echo "🔎 Type checking..."
npm run type-check || {
    echo "❌ TypeScript errors found! Please fix before committing."
    exit 1
}

echo "🧪 Running unit tests..."
npm run test:unit -- --run || {
    echo "❌ Unit tests failed! Please fix before committing."
    exit 1
}

echo ""
echo "✅ Pre-commit checks passed!"
EOF

chmod +x .husky/pre-commit
```

## Paso 4: Crear hook pre-push

```bash
cat > .husky/pre-push << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🚀 Running pre-push checks..."
echo ""

cd app || exit 1

echo "🔗 Running integration tests..."
npm run test:integration -- --run || {
    echo "❌ Integration tests failed! Push blocked."
    exit 1
}

echo "🌐 Running E2E tests..."
npm run test:e2e -- --run || {
    echo "❌ E2E tests failed! Push blocked."
    exit 1
}

echo ""
echo "✅ All tests passed! Pushing to GitHub..."
EOF

chmod +x .husky/pre-push
```

## ✅ ¡Listo!

Ahora cuando hagas:
- `git commit` → Corre lint + type-check + unit tests
- `git push` → Corre integration + e2e tests

Si algo falla, el commit/push se bloquea automáticamente.

## 💰 Ahorro de Créditos

Con Husky instalado:
- ✅ Tests locales: **gratis** y **rápidos** (2-3 min)
- ✅ GitHub Actions: Solo corre cuando TODO ya pasó localmente
- 💰 Ahorras ~90% de créditos GitHub Actions

## Desactivar temporalmente

Si necesitas hacer un commit sin checks:
```bash
git commit --no-verify -m "WIP: work in progress"
```
