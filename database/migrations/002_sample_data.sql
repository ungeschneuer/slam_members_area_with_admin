-- Migration: 002_sample_data.sql
-- Description: Insert sample data for SLAM25 application
-- Created: 2025-01-27
-- Author: SLAM25 Development Team

-- Insert sample users
INSERT INTO users (username, email, password_hash, role, first_name, last_name, pronouns, phone) VALUES
('admin', 'admin@slam25.de', crypt('slamAdmin2025', gen_salt('bf')), 'admin', 'Admin', 'User', 'they/them', '+49 371 123456'),
('judge1', 'judge1@slam25.de', crypt('judge123', gen_salt('bf')), 'judge', 'Maria', 'Schmidt', 'she/her', '+49 371 234567'),
('participant1', 'max.mueller@slam25.de', crypt('participant123', gen_salt('bf')), 'participant', 'Max', 'Müller', 'he/him', '+49 371 345678'),
('participant2', 'anna.weber@slam25.de', crypt('participant123', gen_salt('bf')), 'participant', 'Anna', 'Weber', 'she/her', '+49 371 456789'),
('participant3', 'tom.klein@slam25.de', crypt('participant123', gen_salt('bf')), 'participant', 'Tom', 'Klein', 'he/him', '+49 371 567890'),
('member1', 'member1@slam25.de', crypt('member123', gen_salt('bf')), 'member', 'Lisa', 'Fischer', 'she/her', '+49 371 678901');

-- Insert sample competition
INSERT INTO competitions (name, description, start_date, end_date, location, max_participants, registration_deadline) VALUES
('SLAM25 Chemnitz', 'Das große Poetry Slam Event in Chemnitz 2025', '2025-10-28', '2025-10-28', 'Chemnitz, Deutschland', 50, '2025-10-20');

-- Insert sample participants
INSERT INTO participants (user_id, competition_id, first_name, last_name, pronouns, email, phone, region, role, bio, status) VALUES
((SELECT id FROM users WHERE username = 'participant1'), (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Max', 'Müller', 'he/him', 'max.mueller@slam25.de', '+49 371 345678', 'Sachsen', 'Poet', 'Spoken Word Künstler aus Chemnitz', 'confirmed'),
((SELECT id FROM users WHERE username = 'participant2'), (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Anna', 'Weber', 'she/her', 'anna.weber@slam25.de', '+49 371 456789', 'Thüringen', 'Poet', 'Lyrikerin mit Fokus auf soziale Themen', 'confirmed'),
((SELECT id FROM users WHERE username = 'participant3'), (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Tom', 'Klein', 'he/him', 'tom.klein@slam25.de', '+49 371 567890', 'Sachsen-Anhalt', 'Poet', 'Performance Poet und Aktivist', 'confirmed'),
(NULL, (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Sarah', 'Hoffmann', 'she/her', 'sarah.hoffmann@slam25.de', '+49 371 789012', 'Brandenburg', 'Poet', 'Experimentelle Poesie und Sound Poetry', 'confirmed'),
(NULL, (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'David', 'Wagner', 'he/him', 'david.wagner@slam25.de', '+49 371 890123', 'Mecklenburg-Vorpommern', 'Poet', 'Urban Poetry und Street Art', 'confirmed'),
(NULL, (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Julia', 'Meyer', 'she/her', 'julia.meyer@slam25.de', '+49 371 901234', 'Niedersachsen', 'Poet', 'Naturlyrik und ökologische Themen', 'confirmed'),
(NULL, (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Felix', 'Schulz', 'he/him', 'felix.schulz@slam25.de', '+49 371 012345', 'Hamburg', 'Poet', 'Comedy Poetry und Satire', 'confirmed'),
(NULL, (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Nina', 'Krause', 'she/her', 'nina.krause@slam25.de', '+49 371 123456', 'Bremen', 'Poet', 'Feministische Poesie und Empowerment', 'confirmed'),
(NULL, (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Lukas', 'Becker', 'he/him', 'lukas.becker@slam25.de', '+49 371 234567', 'Hessen', 'Poet', 'Politische Poesie und Gesellschaftskritik', 'confirmed'),
(NULL, (SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Sophie', 'Richter', 'she/her', 'sophie.richter@slam25.de', '+49 371 345678', 'Rheinland-Pfalz', 'Poet', 'Multilinguale Poesie und Migration', 'confirmed');

-- Insert sample rounds
INSERT INTO rounds (competition_id, name, round_type, round_number, max_participants, max_points, start_time, end_time) VALUES
((SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Qualifikationsrunde 1', 'qualifying', 1, 5, 10, '2025-10-28 14:00:00+02', '2025-10-28 15:30:00+02'),
((SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Qualifikationsrunde 2', 'qualifying', 2, 5, 10, '2025-10-28 16:00:00+02', '2025-10-28 17:30:00+02'),
((SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Halbfinale', 'semi_final', 3, 6, 10, '2025-10-28 19:00:00+02', '2025-10-28 20:30:00+02'),
((SELECT id FROM competitions WHERE name = 'SLAM25 Chemnitz'), 'Finale', 'final', 4, 3, 10, '2025-10-28 21:00:00+02', '2025-10-28 22:30:00+02');

-- Insert sample round participants
INSERT INTO round_participants (round_id, participant_id, display_order, points, is_winner) VALUES
-- Qualifikationsrunde 1
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 1'), (SELECT id FROM participants WHERE email = 'max.mueller@slam25.de'), 1, 8, false),
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 1'), (SELECT id FROM participants WHERE email = 'anna.weber@slam25.de'), 2, 9, true),
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 1'), (SELECT id FROM participants WHERE email = 'tom.klein@slam25.de'), 3, 7, false),
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 1'), (SELECT id FROM participants WHERE email = 'sarah.hoffmann@slam25.de'), 4, 6, false),
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 1'), (SELECT id FROM participants WHERE email = 'david.wagner@slam25.de'), 5, 8, false),

-- Qualifikationsrunde 2
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 2'), (SELECT id FROM participants WHERE email = 'julia.meyer@slam25.de'), 1, 9, true),
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 2'), (SELECT id FROM participants WHERE email = 'felix.schulz@slam25.de'), 2, 8, false),
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 2'), (SELECT id FROM participants WHERE email = 'nina.krause@slam25.de'), 3, 7, false),
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 2'), (SELECT id FROM participants WHERE email = 'lukas.becker@slam25.de'), 4, 8, false),
((SELECT id FROM rounds WHERE name = 'Qualifikationsrunde 2'), (SELECT id FROM participants WHERE email = 'sophie.richter@slam25.de'), 5, 6, false);

-- Insert sample content
INSERT INTO content (title, content_type, content, author_id, is_published, published_at) VALUES
('Willkommen bei SLAM25!', 'news', '<h2>Das große Poetry Slam Event kommt nach Chemnitz</h2><p>Am 28. Oktober 2025 findet das erste große Poetry Slam Event in Chemnitz statt. Über 50 talentierte Poeten aus ganz Deutschland werden um den Titel kämpfen.</p><p>Das Event wird in mehreren Runden ausgetragen:</p><ul><li>Qualifikationsrunden</li><li>Halbfinale</li><li>Finale</li></ul>', (SELECT id FROM users WHERE username = 'admin'), true, CURRENT_TIMESTAMP),
('Tipps für Poetry Slam Anfänger', 'tips', '<h3>Wie du deinen ersten Poetry Slam meisterst</h3><p>Hier sind einige wichtige Tipps für alle, die zum ersten Mal bei einem Poetry Slam auftreten:</p><ol><li><strong>Übe deinen Text</strong> - Kenne ihn auswendig</li><li><strong>Timing ist alles</strong> - Halte dich an die Zeitvorgaben</li><li><strong>Kontakt zum Publikum</strong> - Blickkontakt und Gestik</li><li><strong>Authentisch bleiben</strong> - Sei du selbst</li></ol>', (SELECT id FROM users WHERE username = 'judge1'), true, CURRENT_TIMESTAMP),
('Die Geschichte des Poetry Slam', 'fun', '<h3>Von Chicago nach Chemnitz</h3><p>Poetry Slam wurde 1984 in Chicago von Marc Kelly Smith erfunden. Was als kleines Event in einem Jazzclub begann, hat sich zu einer weltweiten Bewegung entwickelt.</p><p>In Deutschland fand der erste Poetry Slam 1994 in Berlin statt. Seitdem hat sich die Szene stetig vergrößert und professionalisiert.</p>', (SELECT id FROM users WHERE username = 'admin'), true, CURRENT_TIMESTAMP),
('Regeln und Ablauf', 'announcement', '<h2>Wichtige Informationen zum Ablauf</h2><p><strong>Zeitlimit:</strong> 3-5 Minuten pro Performance</p><p><strong>Bewertung:</strong> 0-10 Punkte von der Jury</p><p><strong>Verboten:</strong> Requisiten, Kostüme, Musik</p><p><strong>Erlaubt:</strong> Originaltexte, Performance, Gestik</p>', (SELECT id FROM users WHERE username = 'admin'), true, CURRENT_TIMESTAMP);

-- Insert sample events/timetable
INSERT INTO events (title, description, start_time, end_time, location, event_type, status, max_attendees, created_by) VALUES
('Anmeldung und Check-in', 'Anmeldung der Teilnehmer*innen und Ausgabe der Startnummern', '2025-10-28 13:00:00+02', '2025-10-28 13:45:00+02', 'Foyer, Stadthalle Chemnitz', 'registration', 'published', 100, (SELECT id FROM users WHERE username = 'admin')),
('Eröffnung und Begrüßung', 'Offizielle Eröffnung des SLAM25 Events', '2025-10-28 13:45:00+02', '2025-10-28 14:00:00+02', 'Hauptsaal, Stadthalle Chemnitz', 'opening', 'published', 200, (SELECT id FROM users WHERE username = 'admin')),
('Qualifikationsrunde 1', 'Erste Qualifikationsrunde mit 5 Teilnehmer*innen', '2025-10-28 14:00:00+02', '2025-10-28 15:30:00+02', 'Hauptsaal, Stadthalle Chemnitz', 'competition', 'published', 200, (SELECT id FROM users WHERE username = 'admin')),
('Pause', 'Kurze Pause zwischen den Runden', '2025-10-28 15:30:00+02', '2025-10-28 16:00:00+02', 'Foyer, Stadthalle Chemnitz', 'break', 'published', 200, (SELECT id FROM users WHERE username = 'admin')),
('Qualifikationsrunde 2', 'Zweite Qualifikationsrunde mit 5 Teilnehmer*innen', '2025-10-28 16:00:00+02', '2025-10-28 17:30:00+02', 'Hauptsaal, Stadthalle Chemnitz', 'competition', 'published', 200, (SELECT id FROM users WHERE username = 'admin')),
('Abendessen', 'Gemeinsames Abendessen für Teilnehmer*innen und Jury', '2025-10-28 17:30:00+02', '2025-10-28 19:00:00+02', 'Restaurant, Stadthalle Chemnitz', 'dinner', 'published', 50, (SELECT id FROM users WHERE username = 'admin')),
('Halbfinale', 'Halbfinale mit den besten 6 Teilnehmer*innen', '2025-10-28 19:00:00+02', '2025-10-28 20:30:00+02', 'Hauptsaal, Stadthalle Chemnitz', 'competition', 'published', 200, (SELECT id FROM users WHERE username = 'admin')),
('Finale', 'Das große Finale mit den besten 3 Teilnehmer*innen', '2025-10-28 21:00:00+02', '2025-10-28 22:30:00+02', 'Hauptsaal, Stadthalle Chemnitz', 'competition', 'published', 200, (SELECT id FROM users WHERE username = 'admin')),
('Siegerehrung und After-Party', 'Offizielle Siegerehrung und Feier', '2025-10-28 22:30:00+02', '2025-10-29 01:00:00+02', 'Foyer, Stadthalle Chemnitz', 'celebration', 'published', 200, (SELECT id FROM users WHERE username = 'admin'));

-- Insert sample city tips
INSERT INTO city_locations (name, category, description, address, latitude, longitude, contact_info, website, price_range, rating, images) VALUES
('Kunstsammlungen Chemnitz', 'culture', 'Moderne Kunstsammlung mit Expressionisten und zeitgenössischer Kunst', 'Theaterplatz 1, 09111 Chemnitz', 50.8278, 12.9244, '{"phone": "+49 371 488 4424"}', 'https://www.kunstsammlungen-chemnitz.de', '€€', 4.6, '[]'),
('Roter Turm', 'landmark', 'Das Wahrzeichen von Chemnitz - ein gotischer Turm aus dem 12. Jahrhundert', 'Markt, 09111 Chemnitz', 50.8275, 12.9247, '{"phone": "+49 371 488 4424"}', 'https://www.chemnitz.de', '€', 4.3, '[]'),
('Opernhaus Chemnitz', 'culture', 'Historisches Opernhaus mit vielfältigem Programm', 'Theaterplatz 2, 09111 Chemnitz', 50.8280, 12.9240, '{"phone": "+49 371 696 90"}', 'https://www.theater-chemnitz.de', '€€€', 4.5, '[]'),
('Kassberg', 'neighborhood', 'Historisches Viertel mit Jugendstil-Architektur', 'Kassberg, 09112 Chemnitz', 50.8300, 12.9200, NULL, NULL, '€', 4.2, '[]'),
('Stadtpark Chemnitz', 'nature', 'Großer Stadtpark mit Teichen und Wanderwegen', 'Stadtpark, 09113 Chemnitz', 50.8250, 12.9300, NULL, NULL, '€', 4.1, '[]'),
('Gunzenhauser Museum', 'culture', 'Kunstmuseum mit moderner Kunst', 'Falkeplatz, 09112 Chemnitz', 50.8290, 12.9280, '{"phone": "+49 371 488 4424"}', 'https://www.kunstsammlungen-chemnitz.de', '€€', 4.4, '[]'),
('Chemnitz Hauptbahnhof', 'transport', 'Hauptbahnhof mit guter Anbindung', 'Bahnhofstraße, 09111 Chemnitz', 50.8400, 12.9300, '{"phone": "+49 371 123 456"}', 'https://www.bahnhof.de', '€', 3.8, '[]'),
('Küchwald', 'nature', 'Großer Waldpark am Stadtrand', 'Küchwald, 09117 Chemnitz', 50.8200, 12.9400, NULL, NULL, '€', 4.0, '[]'),
('Stadtbad Chemnitz', 'leisure', 'Historisches Stadtbad mit Wellness-Bereich', 'Müllerstraße 1, 09112 Chemnitz', 50.8320, 12.9260, '{"phone": "+49 371 488 1234"}', 'https://www.stadtbad-chemnitz.de', '€€', 4.2, '[]'),
('Chemnitz Arena', 'sports', 'Moderne Sporthalle für Großveranstaltungen', 'Messeallee 1, 09112 Chemnitz', 50.8350, 12.9250, '{"phone": "+49 371 488 5678"}', 'https://www.chemnitz-arena.de', '€€', 4.3, '[]');

-- Insert migration record
INSERT INTO migrations (migration_name) VALUES ('002_sample_data.sql');
