-- Add dashboard hero text settings to settings table
-- These settings control the main hero section text on the member dashboard

INSERT INTO settings (key, value, description) 
VALUES 
  ('dashboard_hero_heading', 'Willkommen bei SLAM25', 'Main heading text displayed in the hero section of the member dashboard'),
  ('dashboard_hero_subtitle', 'Dein Poetry Slam Community Hub', 'Subtitle text displayed below the main heading in the hero section'),
  ('dashboard_hero_description', 'Entdecke Teilnehmer*innen, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden.', 'Description text displayed below the subtitle in the hero section')
ON CONFLICT (key) DO NOTHING;
