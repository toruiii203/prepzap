import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  "https://sieizvhprgcqrkalnkht.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTg2NDksImV4cCI6MjA5MjMzNDY0OX0.-U8zu8Midq8PGaUPSRqhC-vVU1RnCH4yPOs_ZuppC_8"
)
