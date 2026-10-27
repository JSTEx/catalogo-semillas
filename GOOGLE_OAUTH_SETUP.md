# Configurar Google OAuth

## 1) Google Cloud Console
1. Ve a https://console.cloud.google.com/
2. Crea o selecciona un proyecto
3. Ve a "APIs y servicios" > "Pantalla de consentimiento OAuth"
   - Tipo: Externo (o Interno si solo tú)
   - Nombre de la app: JecsitoShop
   - Correo de soporte y datos de contacto
   - Añade dominios autorizados si es necesario
   - Guarda
4. Ve a "Credenciales" > "Crear credenciales" > "ID de cliente OAuth"
   - Tipo de aplicación: Aplicación web
   - Nombre: JecsitoShop
   - Orígenes autorizados de JavaScript:
     - http://localhost:3000
     - https://TU-DOMINIO-VERCEL.vercel.app
   - URIs de redirección autorizados:
     - http://localhost:3000/api/auth/callback/google
     - https://TU-DOMINIO-VERCEL.vercel.app/api/auth/callback/google
5. Copia Client ID y Client Secret

## 2) Variables de entorno
En .env.local (local):
```
AUTH_SECRET=G9MlcqbvB0SzSyhn/rbB2N4+mFotUr6oAsjlgvwrXG4=
AUTH_GOOGLE_ID=tu-client-id
AUTH_GOOGLE_SECRET=tu-client-secret
```

En Vercel (Producción):
Settings > Environment Variables añadir:
- AUTH_SECRET
- AUTH_GOOGLE_ID  
- AUTH_GOOGLE_SECRET

## 3) Probar
1. npm run dev
2. Ir a http://localhost:3000
3. Click "Iniciar sesión" > Google
4. Al loguearte, se vincularán automáticamente los pedidos con ese email
