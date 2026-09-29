ALTER TABLE "collections" ADD COLUMN "source_ref" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "source_ref" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "source_ref" text;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_source_ref_unique" UNIQUE("source_ref");--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_ref_unique" UNIQUE("source_ref");--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_source_ref_unique" UNIQUE("source_ref");