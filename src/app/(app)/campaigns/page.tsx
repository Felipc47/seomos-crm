import { CampaignsClient } from "@/components/campaigns/campaigns-client";

export const dynamic = "force-dynamic";

export default function CampaignsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="crm-page-header">
        <p className="crm-eyebrow mb-2">Automatización · WhatsApp</p>
        <h2 className="crm-heading">Envío masivo</h2>
        <p className="mt-2 text-[13px] text-mute">Prepara tu mensaje, define la audiencia y sigue cada envío.</p>
      </header>
      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-[34px] md:py-[26px]">
        <div className="mx-auto max-w-[1400px]">
          <CampaignsClient />
        </div>
      </div>
    </div>
  );
}
