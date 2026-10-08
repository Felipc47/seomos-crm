ALTER TABLE "mailing_sender" ADD COLUMN "track_opens" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mailing_sender" ADD COLUMN "track_clicks" boolean DEFAULT false NOT NULL;