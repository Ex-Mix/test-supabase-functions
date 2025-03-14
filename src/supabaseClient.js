import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://egwljpilcnffmvqhnhkz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2xqcGlsY25mZm12cWhuaGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MzkyMDIsImV4cCI6MjA1NjIxNTIwMn0.m_JRpUuYse0R1gWGpE00030HZle5gL3w5Bj2rB9mZ4g";
export const supabase = createClient(supabaseUrl, supabaseKey);