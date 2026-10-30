"use client";

import { UserRound } from "lucide-react";
import type { MessageDto } from "@/lib/types";
import { contactEmailHref, contactPhoneHref, contactWebHref } from "@/lib/shared-contacts";

export function SharedContactAttachment({ m }: { m: MessageDto }) {
  const contacts = m.sharedContacts ?? [];
  return (
    <div className="min-w-0 space-y-2">
      {contacts.length ? contacts.map((contact, index) => (
        <section key={index} aria-label={`Contacto compartido: ${contact.name}`} className="min-w-0 space-y-2 rounded-xl border border-border/80 bg-surface-2/60 p-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-brand"><UserRound className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-3">Contacto compartido</p>
              <p className="break-words font-semibold [overflow-wrap:anywhere]">{contact.name}</p>
              {contact.organization && <p className="break-words text-xs text-text-3 [overflow-wrap:anywhere]">{contact.organization}</p>}
            </div>
          </div>
          {contact.phones.map((phone, i) => <p key={i} className="break-words [overflow-wrap:anywhere]"><span className="block text-[11px] text-text-3">Teléfono{phone.label ? ` · ${phone.label}` : ""}</span><a href={contactPhoneHref(phone.number)} className="font-medium underline decoration-border underline-offset-4">{phone.number}</a></p>)}
          {contact.emails.map((email, i) => <p key={i} className="break-words [overflow-wrap:anywhere]"><span className="block text-[11px] text-text-3">Correo{email.label ? ` · ${email.label}` : ""}</span><a href={contactEmailHref(email.email)} className="underline decoration-border underline-offset-4">{email.email}</a></p>)}
          {contact.addresses.map((address, i) => <p key={i} className="break-words text-xs [overflow-wrap:anywhere]"><span className="block text-[11px] text-text-3">Dirección</span>{address}</p>)}
          {contact.urls.map((url, i) => <p key={i} className="break-words text-xs [overflow-wrap:anywhere]"><a href={contactWebHref(url)} target="_blank" rel="noopener noreferrer" className="underline decoration-border underline-offset-4">{url}</a></p>)}
          {contact.birthday && <p className="text-xs"><span className="text-text-3">Cumpleaños: </span>{contact.birthday}</p>}
          {!contact.phones.length && !contact.emails.length && <p className="text-xs text-text-3">Sin teléfono ni correo en la ficha recibida.</p>}
        </section>
      )) : (
        <div className="max-w-xs space-y-1">
          <p className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4" aria-hidden="true" />Contacto compartido</p>
          <p className="text-xs text-text-3">Los datos de este contacto no están disponibles. Pide que lo compartan de nuevo para poder verlos.</p>
        </div>
      )}
      {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
    </div>
  );
}
