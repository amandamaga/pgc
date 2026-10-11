-- AddColumn
ALTER TABLE "responses"
  ADD COLUMN "story_shown_at" TIMESTAMP(3),
  ADD COLUMN "next_story_available_at" TIMESTAMP(3);
