CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"patient_id" text,
	"action" text NOT NULL,
	"target" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"patient_id" text,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_links" (
	"caregiver_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"relationship" text DEFAULT 'Caregiver' NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "care_links_caregiver_id_patient_id_pk" PRIMARY KEY("caregiver_id","patient_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"game_type" text NOT NULL,
	"direction" text NOT NULL,
	"from_level" integer NOT NULL,
	"to_level" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"session_id" text,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"patient_id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Mimo' NOT NULL,
	"appearance" jsonb NOT NULL,
	"equipped" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coin_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"memory_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"caption" text,
	"narration_memory_id" text
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_adventures" (
	"patient_id" text NOT NULL,
	"day" text NOT NULL,
	"tasks" jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_adventures_patient_id_day_pk" PRIMARY KEY("patient_id","day")
);
--> statement-breakpoint
CREATE TABLE "daily_pairs" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"left_memory_id" text NOT NULL,
	"left_label" text NOT NULL,
	"left_box" jsonb,
	"right_memory_id" text NOT NULL,
	"right_label" text NOT NULL,
	"right_box" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"round_index" integer NOT NULL,
	"type" text NOT NULL,
	"correct" boolean,
	"response_ms" integer,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"game_type" text NOT NULL,
	"world_id" text,
	"level_id" text,
	"memory_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"challenge_level" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"activity" jsonb NOT NULL,
	"state" jsonb NOT NULL,
	"rounds_total" integer DEFAULT 0 NOT NULL,
	"rounds_completed" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"first_try_correct" integer DEFAULT 0 NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"skips" integer DEFAULT 0 NOT NULL,
	"avg_response_ms" integer,
	"caregiver_supported" boolean DEFAULT false NOT NULL,
	"coins_awarded" integer DEFAULT 0 NOT NULL,
	"pool_source" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "garden_state" (
	"patient_id" text PRIMARY KEY NOT NULL,
	"grown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"placed" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_progress" (
	"patient_id" text NOT NULL,
	"level_id" text NOT NULL,
	"world_id" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_completed_at" timestamp with time zone,
	"last_completed_at" timestamp with time zone,
	"last_played_at" timestamp with time zone,
	"times_played" integer DEFAULT 0 NOT NULL,
	"times_completed" integer DEFAULT 0 NOT NULL,
	"coins_earned" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "level_progress_patient_id_level_id_pk" PRIMARY KEY("patient_id","level_id")
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"media_type" text NOT NULL,
	"resource_type" text NOT NULL,
	"delivery_type" text NOT NULL,
	"public_id" text NOT NULL,
	"asset_id" text,
	"version" bigint,
	"format" text,
	"width" integer,
	"height" integer,
	"duration" real,
	"bytes" integer,
	"asset_folder" text,
	"original_filename" text,
	"category" text DEFAULT 'other' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"event" text,
	"year" integer,
	"approx_date" text,
	"location" text,
	"language" text DEFAULT 'en' NOT NULL,
	"importance" integer DEFAULT 3 NOT NULL,
	"caption" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"faces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"game_eligible" boolean DEFAULT false NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"favorited_at" timestamp with time zone,
	"linked_memory_id" text,
	"linked_person_id" text,
	"sync" jsonb DEFAULT '{"metadataSynced":false}'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memories_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "memory_objects" (
	"id" text PRIMARY KEY NOT NULL,
	"memory_id" text NOT NULL,
	"label" text NOT NULL,
	"box" jsonb,
	"source" text DEFAULT 'caregiver' NOT NULL,
	"confidence" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_people" (
	"id" text PRIMARY KEY NOT NULL,
	"memory_id" text NOT NULL,
	"person_id" text NOT NULL,
	"face" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owned_items" (
	"patient_id" text NOT NULL,
	"item_id" text NOT NULL,
	"source" text DEFAULT 'purchase' NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owned_items_patient_id_item_id_pk" PRIMARY KEY("patient_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "patient_badges" (
	"patient_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_badges_patient_id_badge_id_pk" PRIMARY KEY("patient_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "patient_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"type" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_profiles" (
	"patient_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"address_as" text NOT NULL,
	"birth_year" integer,
	"hometown" text,
	"about" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_profiles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"name" text NOT NULL,
	"relationship_key" text DEFAULT 'custom' NOT NULL,
	"relationship_label" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"patient_id" text PRIMARY KEY NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"enabled_games" text[] DEFAULT '{}'::text[] NOT NULL,
	"preferred_games" text[] DEFAULT '{}'::text[] NOT NULL,
	"preferred_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"session_minutes" integer DEFAULT 20 NOT NULL,
	"break_reminder_minutes" integer DEFAULT 15 NOT NULL,
	"exposure_seconds" integer DEFAULT 0 NOT NULL,
	"voice" jsonb NOT NULL,
	"accessibility" jsonb NOT NULL,
	"challenge" jsonb NOT NULL,
	"consent" jsonb NOT NULL,
	"starter_pack" boolean DEFAULT true NOT NULL,
	"daily_adventures" boolean DEFAULT true NOT NULL,
	"all_destinations_open" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_te" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"asset_key" text NOT NULL,
	"unlock_requirement" jsonb,
	"seasonal" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"password_hash" text,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"patient_id" text PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"lifetime_earned" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_state" (
	"patient_id" text NOT NULL,
	"world_id" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_visited_at" timestamp with time zone,
	CONSTRAINT "world_state_patient_id_world_id_pk" PRIMARY KEY("patient_id","world_id")
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_links" ADD CONSTRAINT "care_links_caregiver_id_users_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_links" ADD CONSTRAINT "care_links_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_offers" ADD CONSTRAINT "challenge_offers_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_adventures" ADD CONSTRAINT "daily_adventures_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_pairs" ADD CONSTRAINT "daily_pairs_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_pairs" ADD CONSTRAINT "daily_pairs_left_memory_id_memories_id_fk" FOREIGN KEY ("left_memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_pairs" ADD CONSTRAINT "daily_pairs_right_memory_id_memories_id_fk" FOREIGN KEY ("right_memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden_state" ADD CONSTRAINT "garden_state_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_progress" ADD CONSTRAINT "level_progress_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_objects" ADD CONSTRAINT "memory_objects_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_people" ADD CONSTRAINT "memory_people_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_people" ADD CONSTRAINT "memory_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owned_items" ADD CONSTRAINT "owned_items_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_badges" ADD CONSTRAINT "patient_badges_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_events" ADD CONSTRAINT "patient_events_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_state" ADD CONSTRAINT "world_state_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_patient_idx" ON "audit_log" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "challenge_offers_patient_idx" ON "challenge_offers" USING btree ("patient_id","offered_at");--> statement-breakpoint
CREATE INDEX "coin_tx_patient_idx" ON "coin_transactions" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "collection_items_collection_idx" ON "collection_items" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collections_patient_idx" ON "collections" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "game_events_session_idx" ON "game_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "game_sessions_patient_idx" ON "game_sessions" USING btree ("patient_id","started_at");--> statement-breakpoint
CREATE INDEX "game_sessions_patient_game_idx" ON "game_sessions" USING btree ("patient_id","game_type");--> statement-breakpoint
CREATE INDEX "memories_patient_idx" ON "memories" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "memories_patient_status_idx" ON "memories" USING btree ("patient_id","status");--> statement-breakpoint
CREATE INDEX "memory_objects_memory_idx" ON "memory_objects" USING btree ("memory_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_people_unique" ON "memory_people" USING btree ("memory_id","person_id");--> statement-breakpoint
CREATE INDEX "patient_events_patient_idx" ON "patient_events" USING btree ("patient_id","type","created_at");--> statement-breakpoint
CREATE INDEX "people_patient_idx" ON "people" USING btree ("patient_id");