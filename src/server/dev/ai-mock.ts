/**
 * Proveedor LLM determinista para el self-test (contrato mocks.md).
 * Despacha por contenido del último mensaje `user`. JAMÁS es fallback en
 * runtime: solo responde si OPENROUTER_BASE_URL apunta explícitamente a él y
 * el gate de mocks está activo.
 */

type ContentPart =
  | { type: "text"; text?: string }
  | { type: "image_url"; image_url?: { url?: string } };

type InMessage = { role: string; content: string | ContentPart[] };

/**
 * Aplana el contenido multimodal (007). Las "imágenes" del self-test son
 * texto codificado en el data URI, así que se decodifican y se anuncian como
 * `[IMAGEN: …]`: si esa marca aparece, la imagen viajó DE VERDAD hasta el
 * proveedor.
 */
export function flattenContent(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .map((part) => {
      if (part.type === "text") return part.text ?? "";
      const url = part.image_url?.url ?? "";
      const base64 = url.split(",")[1] ?? "";
      const decoded = base64
        ? Buffer.from(base64, "base64").toString("utf8")
        : "";
      return `[IMAGEN: ${decoded.slice(0, 200)}]`;
    })
    .filter(Boolean)
    .join(" ");
}

export function hasImage(messages: InMessage[]): boolean {
  return messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((p) => p.type === "image_url")
  );
}

function mockServiceDetection(
  system: string,
  transcript: string
): { serviceId: string | null; serviceEvidence: string | null } {
  const text = transcript.toLowerCase();
  const serviceRows = [...system.matchAll(/^- (svc_[^:\s]+): (.+)$/gm)];
  const serviceByName = (pattern: RegExp) =>
    serviceRows.find((row) => pattern.test(row[2] ?? ""))?.[1] ?? null;
  const evidenceFor = (pattern: RegExp) => {
    const line = transcript
      .split("\n")
      .find((candidate) => pattern.test(candidate));
    return line?.replace(/^(Cliente|Negocio):\s*/i, "").trim() ?? null;
  };
  if (text.includes("servicio fantasma")) {
    return {
      serviceId: "svc_inventado_fuera_de_allowlist",
      serviceEvidence: evidenceFor(/servicio fantasma/i),
    };
  }
  const webEvidence = evidenceFor(
    /página web|pagina web|tienda virtual|carrito de compras|joomla/i
  );
  if (webEvidence) {
    return {
      serviceId: serviceByName(/desarrollo\s*web|tienda|e-?commerce/i),
      serviceEvidence: webEvidence,
    };
  }
  const seoEvidence = evidenceFor(/\bseo\b|posicionamiento/i);
  if (seoEvidence) {
    return {
      serviceId: serviceByName(/seo|posicionamiento/i),
      serviceEvidence: seoEvidence,
    };
  }

  // US29 reproduce deliberadamente un proveedor sobreconfiado: intenta usar
  // el primer servicio ante saludo, identidad o consulta genérica. El guard
  // del servidor debe rechazarlo aunque el ID pertenezca a la allowlist.
  const prematureEvidence = evidenceFor(
    /^(?:Cliente:\s*)?(?:hola(?:,? quisiera información)?|soy\s+[\p{L}\s'-]+|quisiera información)$/iu
  );
  if (prematureEvidence && serviceRows[0]?.[1]) {
    return {
      serviceId: serviceRows[0][1],
      serviceEvidence: prematureEvidence,
    };
  }

  return { serviceId: null, serviceEvidence: null };
}

export function aiMockCompletion(messages: InMessage[]): string {
  const system = flattenContent(
    messages.find((m) => m.role === "system")?.content ?? ""
  );
  const lastUser = flattenContent(
    [...messages].reverse().find((m) => m.role === "user")?.content ?? ""
  );

  // 008: mensaje de seguimiento (ventana de 24h abierta). Determinista para
  // que el self-test verifique que el intento retoma la conversación.
  if (system.includes("[SEGUIMIENTO]")) {
    return JSON.stringify({
      text: "¡Hola de nuevo! Te escribo para retomar nuestra conversación pendiente. ¿Te viene bien seguir ahora?",
    });
  }

  // Ficha del lead (pasada aparte, tras el turno): extrae del transcript lo
  // que el "cliente" dijo. Determinista: reconoce las frases del guion E2E.
  if (system.includes("analista de CRM")) {
    const t = lastUser.toLowerCase();
    const negocio = /panader[íi]a\s+([\wáéíóúñ]+)/i.exec(lastUser);
    const nombre = /me llamo\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+)/i.exec(lastUser);
    const clientEvidence = lastUser
      .split("\n")
      .filter((line) => line.startsWith("Cliente:"))
      .join("\n");
    const { serviceId, serviceEvidence } = mockServiceDetection(
      system,
      clientEvidence
    );
    return JSON.stringify({
      contactName: nombre?.[1] ?? null,
      businessName: negocio ? `Panadería ${negocio[1]}` : null,
      businessType: t.includes("panader") ? "Panadería" : null,
      needs: t.includes("página web")
        ? ["Página web para vender en línea"]
        : [],
      budget: /presupuesto de ([^.,\n]+)/i.exec(lastUser)?.[1]?.trim() ?? null,
      timeline: t.includes("este mes") ? "Este mes" : null,
      summary: negocio
        ? `Dueño de Panadería ${negocio[1]}; busca una página web para vender en línea.`
        : null,
      serviceId,
      serviceEvidence,
    });
  }

  const text = lastUser.toLowerCase();
  const { serviceId, serviceEvidence } = mockServiceDetection(system, lastUser);

  if (
    serviceId &&
    (/^hola(?:,? quisiera información)?[.!]?$/iu.test(lastUser.trim()) ||
      /^soy\s+[\p{L}'-]+(?:\s+[\p{L}'-]+){0,3}[.!]?$/iu.test(
        lastUser.trim()
      ) ||
      /^quisiera información[.!]?$/iu.test(lastUser.trim()))
  ) {
    const qualificationReply = /^soy\s+/iu.test(lastUser.trim())
      ? "Mucho gusto. ¿Qué servicio o necesidad concreta tienes?"
      : /^quisiera información/iu.test(lastUser.trim())
        ? "Claro. ¿Sobre qué servicio o necesidad concreta buscas información?"
        : "Para orientarte bien, ¿qué servicio o necesidad concreta tienes?";
    return JSON.stringify({
      action: "reply",
      text: qualificationReply,
      serviceId,
      serviceEvidence,
    });
  }

  // 007: el turno trae una imagen. Se responde citando su contenido para que
  // el self-test pueda comprobar que el modelo la recibió de verdad.
  const imageMatch = /\[IMAGEN: ([^\]]*)\]/.exec(lastUser);
  if (imageMatch) {
    return JSON.stringify({
      action: "reply",
      text: `Veo en la imagen: ${imageMatch[1]?.trim()}. ¿Cómo te ayudo con eso?`,
      ...(serviceId ? { serviceId, serviceEvidence } : {}),
    });
  }

  // Persona pide_humano (el regex de respaldo captura la frase canónica; esta
  // rama cubre variantes que llegan al modelo).
  if (text.includes("humano") || text.includes("asesor")) {
    return JSON.stringify({ action: "handoff", reason: "cliente" });
  }

  // 004: agendar reunión — solo si el system prompt ofrece la acción (es
  // decir, con Google Calendar conectado) y el cliente dio correo + intención.
  // El correo puede haberlo dado en un mensaje ANTERIOR (caso real: primero el
  // correo, después "11 am" a secas para elegir horario).
  const allUser = messages
    .filter((m) => m.role === "user")
    .map((m) => flattenContent(m.content))
    .join("\n");
  // El correo puede venir YA conocido en el system prompt (ficha del contacto):
  // en ese caso el modelo no debe pedirlo, solo usarlo.
  const knownEmail = /YA TIENES el correo de este cliente: ([\w.+-]+@[\w-]+\.[\w.-]*\w)/i
    .exec(system)?.[1];
  const emailMatch =
    lastUser.match(/[^\s@]+@[^\s@]+\.[^\s@]+/) ??
    allUser.match(/[^\s@]+@[^\s@]+\.[^\s@]+/) ??
    (knownEmail ? [knownEmail] : null);
  // Respuesta corta con hora ("11 am", "a las 11", "11"): el cliente está
  // eligiendo entre los horarios ofrecidos.
  const bareTime = /^\s*(a\s+las\s+)?\d{1,2}(:\d{2})?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?\s*$/i.test(
    lastUser
  );
  if (
    system.includes("schedule_meeting") &&
    emailMatch &&
    (text.includes("agend") || text.includes("reuni") || bareTime)
  ) {
    // "hoy mismo" simula al modelo pidiendo ANTES de la antelación mínima;
    // "medianoche" simula una hora fuera del horario laboral. El servidor
    // debe rechazar ambos con el mensaje correspondiente.
    const tooSoon = text.includes("hoy mismo");
    const offHours = text.includes("medianoche");
    const start = new Date(
      Date.now() + (tooSoon ? 2 * 3600_000 : 5 * 24 * 3600_000)
    );
    if (offHours) {
      start.setUTCHours(3, 0, 0, 0); // 22:00 Bogotá — fuera de jornada
    } else if (bareTime) {
      // La hora que eligió el cliente (Bogotá = UTC-5).
      const h = Number(/\d{1,2}/.exec(lastUser)?.[0] ?? "10");
      const pm = /p\.?\s*m\.?/i.test(lastUser);
      const hour24 = pm && h < 12 ? h + 12 : h;
      start.setUTCHours(hour24 + 5, 0, 0, 0);
    } else {
      start.setUTCHours(15, 0, 0, 0); // 10:00 Bogotá — franja válida
    }
    // Evitar fin de semana (validación de día hábil del servidor).
    while (!tooSoon && [0, 6].includes(start.getUTCDay())) {
      start.setTime(start.getTime() + 24 * 3600_000);
    }
    // "sin confirmar" simula al modelo agendando sin que el cliente haya
    // confirmado la hora (omite clientOk): el pipeline debe frenar y ofrecer
    // horarios en lugar de crear el evento.
    return JSON.stringify({
      action: "schedule_meeting",
      email: emailMatch[0],
      datetime: start.toISOString(),
      clientOk: text.includes("sin confirmar") ? undefined : lastUser,
    });
  }

  // 008: el cliente pide que lo contacten más tarde → rutina de seguimiento.
  // "en dos horas" incluye datetime (el cliente dijo cuándo); el resto usa el
  // default de 12 horas del servidor.
  if (
    text.includes("más tarde") ||
    text.includes("mas tarde") ||
    text.includes("otra semana") ||
    text.includes("ahora no puedo")
  ) {
    const saidWhen = text.includes("en dos horas");
    return JSON.stringify({
      action: "follow_up_later",
      ...(saidWhen
        ? { datetime: new Date(Date.now() + 2 * 3600_000).toISOString() }
        : {}),
      reply: "¡Claro, sin problema! Te escribo más adelante para retomar. ¡Que estés muy bien!",
    });
  }

  // Intención de compra → mover a Calificado.
  if (
    text.includes("lo compro") ||
    text.includes("quiero comprar") ||
    text.includes("me lo llevo")
  ) {
    return JSON.stringify({
      action: "move_stage",
      stage: "Calificado",
      reply: "¡Excelente! Te aparto el producto y un compañero te confirma el pago.",
    });
  }

  // Cierre: solo agradecimiento/despedida → despedida breve (contrato del
  // prompt). Si el cliente insiste, el guard anti-repetición del pipeline
  // suprime el segundo cierre idéntico.
  const bare = text.replace(/[¡!¿?.,;:]/g, "").replace(/\s+/g, " ").trim();
  const closures = [
    "gracias",
    "muchas gracias",
    "mil gracias",
    "perfecto gracias",
    "listo gracias",
    "ok gracias",
    "vale gracias",
    "adios",
    "adiós",
    "hasta luego",
    "chao",
  ];
  if (closures.includes(bare)) {
    return JSON.stringify({
      action: "reply",
      text: "¡Con mucho gusto! Cualquier cosa me escribes.",
    });
  }

  if (/^- svc_[^:\s]+: .+$/m.test(system) && !serviceId) {
    return JSON.stringify({
      action: "reply",
      text: "Para orientarte bien, ¿qué necesitas exactamente: desarrollo web, SEO u otro servicio?",
    });
  }

  const eco = lastUser.slice(0, 80);
  return JSON.stringify({
    action: "reply",
    text: `Respuesta de prueba sobre: ${eco}`,
    ...(serviceId ? { serviceId, serviceEvidence } : {}),
  });
}
