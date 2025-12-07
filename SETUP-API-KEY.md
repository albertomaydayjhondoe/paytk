# 🔑 Configurar API Key por Defecto

Para que la aplicación funcione sin que los usuarios tengan que ingresar su propia API key, necesitas configurar un **GitHub Secret**.

## Método 1: Script Automático (Recomendado)

```bash
./setup-api-key.sh
```

El script te pedirá la API key y la configurará automáticamente.

## Método 2: Interfaz Web de GitHub

1. **Obtén tu API key de Gemini**
   - Ve a: https://aistudio.google.com/app/apikey
   - Click en "Create API Key"
   - Copia la key generada

2. **Configura el Secret en GitHub**
   - Ve a: https://github.com/albertomaydayjhondoe/paytk/settings/secrets/actions
   - Click en "New repository secret"
   - Name: `GEMINI_API_KEY`
   - Secret: Pega tu API key
   - Click "Add secret"

3. **Despliega los cambios**
   ```bash
   git push
   ```

## Método 3: GitHub CLI

```bash
# Si tienes gh CLI instalado
gh secret set GEMINI_API_KEY
# Pega tu API key cuando te lo pida
```

---

## ✅ Verificación

Después de configurar el secret:

1. Haz un commit y push
2. GitHub Actions se ejecutará automáticamente
3. La app se desplegará con la API key incluida
4. Los usuarios podrán usar la app inmediatamente

---

## 🎯 Cómo Funciona

- La API key se inyecta durante el build via `VITE_GEMINI_API_KEY`
- Se almacena de forma segura en el bundle compilado
- Los usuarios pueden usar la key por defecto o ingresar la suya
- El modal tiene un botón "Usar Key por Defecto"

---

## 🔒 Seguridad

⚠️ **Importante**: 
- La API key estará visible en el código JavaScript del cliente
- Configura límites de uso en Google Cloud Console
- Restringe la key solo para Gemini API
- Monitorea el uso regularmente

Para mayor seguridad, considera implementar un backend que maneje las API keys.

---

## 🆘 Solución de Problemas

### Error: "gh: command not found"
```bash
# Instala GitHub CLI
# macOS
brew install gh

# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### Error: "Not logged in to GitHub CLI"
```bash
gh auth login
```

### La API key no se inyecta
1. Verifica que el secret esté configurado correctamente
2. Revisa los logs de GitHub Actions
3. Asegúrate de que `VITE_GEMINI_API_KEY` esté en el workflow

---

## 📚 Referencias

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub CLI](https://cli.github.com/)
- [Google AI Studio](https://aistudio.google.com/app/apikey)
# API Key Configured
