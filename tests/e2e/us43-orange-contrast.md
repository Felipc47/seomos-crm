# US43: contraste en superficies de marca

Ejecutar `node tests/e2e/us43-orange-contrast.mjs` sobre localhost:3104, seomos_demo_032 y los mocks de IA/Resend/WhatsApp. El guion rechaza hosts de producción. Reutiliza el usuario local demo032@test.local, habilita temporalmente mailing solo en su empresa y restaura esa preferencia y el branding al finalizar.

Audita texto y SVG visibles que estén sobre fondo naranja sólido, incluyendo fondos heredados de ancestros, exigiendo blanco y contraste >=4,5:1. Recorre 12 vistas en claro/oscuro, verifica guardar remitente con mock, hover, chat demo y botón deshabilitado, tres previews de acento personalizado, landing y móvil de 390 px. Capturas en .artifacts/us43-orange-contrast; reporte incluye elementos y colores calculados. Las rutas vacías sin controles rellenos se contabilizan como cero elementos auditables; el inventario fuente confirma que usan los mismos tokens de marca.
