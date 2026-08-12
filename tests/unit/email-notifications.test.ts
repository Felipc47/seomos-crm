import { describe, expect, it } from "vitest";
import {
  buildNewLeadEmail,
  escapeEmailHtml,
} from "@/server/email/new-lead";
import {
  previousCompletedWeek,
  summarizeDigestRows,
  type DigestLeadRow,
} from "@/server/email/weekly-digest";

const rows: DigestLeadRow[] = [
  {
    leadId: "ld_1",
    contactId: "ct_1",
    contactName: "Ada & Co",
    stageName: "Nuevo",
    stageKind: "open",
    serviceName: "SEO",
    assigneeMemberId: "mem_ana",
    assigneeUserId: "usr_ana",
    assigneeName: "Ana",
  },
  {
    leadId: "ld_2",
    contactId: "ct_2",
    contactName: "Bruno",
    stageName: "Cliente",
    stageKind: "won",
    serviceName: null,
    assigneeMemberId: "mem_ana",
    assigneeUserId: "usr_ana",
    assigneeName: "Ana",
  },
  {
    leadId: "ld_3",
    contactId: "ct_3",
    contactName: "Carla",
    stageName: "Nuevo",
    stageKind: "open",
    serviceName: "Web",
    assigneeMemberId: null,
    assigneeUserId: null,
    assigneeName: null,
  },
];

describe("email notifications", () => {
  it("escapa texto externo en el HTML", () => {
    expect(escapeEmailHtml(`<Ada & "Co">`)).toBe(
      "&lt;Ada &amp; &quot;Co&quot;&gt;"
    );
    const email = buildNewLeadEmail({
      organizationName: "Empresa <uno>",
      contactName: "Ada & Co",
      serviceName: null,
      stageName: "Nuevo",
      href: "https://crm.example/inbox?contact=ct_1",
    });
    expect(email.html).toContain("Ada &amp; Co");
    expect(email.html).not.toContain("Empresa <uno>");
    expect(email.text).toContain("Ada & Co");
  });

  it("calcula la última semana completa lunes a lunes en la zona local", () => {
    expect(
      previousCompletedWeek(
        new Date("2026-08-12T15:00:00.000Z"),
        "America/Bogota"
      )
    ).toEqual({ from: "2026-08-03", to: "2026-08-10" });
  });

  it("resume el panorama exacto y el subconjunto de un responsable", () => {
    const admin = summarizeDigestRows(rows);
    expect(admin.total).toBe(3);
    expect(admin.unassigned).toBe(1);
    expect(admin.byStage).toEqual([
      { name: "Nuevo", count: 2 },
      { name: "Cliente", count: 1 },
    ]);
    expect(admin.byAssignee).toEqual([
      { name: "Ana", count: 2 },
      { name: "Sin asignar", count: 1 },
    ]);

    const mine = summarizeDigestRows(
      rows.filter((row) => row.assigneeMemberId === "mem_ana")
    );
    expect(mine.total).toBe(2);
    expect(mine.unassigned).toBe(0);
    expect(mine.details).toHaveLength(2);
  });

  it("limita el detalle a 20 sin alterar los totales", () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      ...rows[0]!,
      leadId: `ld_${index}`,
      contactId: `ct_${index}`,
    }));
    const summary = summarizeDigestRows(many);
    expect(summary.total).toBe(25);
    expect(summary.details).toHaveLength(20);
  });
});
