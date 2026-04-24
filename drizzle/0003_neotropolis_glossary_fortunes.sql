-- Re-version fortunes against the official Neotropolis Glossary v2.1.
-- Group A (v2): replace earlier v1 fortunes that used invented sci-fi names
-- (Sysgorian, Tau Ceti H, K2-136 B, Outpost 84, Sentinel III, Bay 54, Ceres)
-- with terms that exist in the canonical glossary.
-- Group B (v1): lore-enrich generic fortunes with real Neotropolis terms.

-- Group A: replace non-canonical terms with glossary lore
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (20, 2, 'the Kepler Spire glitches into retrograde over sector 7. double-check all transmissions');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (54, 2, 'the rings of Kepler-609c shimmer above the comm tower — love finds a new channel');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (64, 2, 'a wormhole opens near the Cygnus relay — your voice carries far today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (73, 2, 'the forges of Nomatech Arms glow through the factory district — channel fire into creation');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (88, 2, 'the Splendor Protocol leaks into the lower bandwidth — dreams are prophetic tonight');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (98, 2, 'a Ringers'' shuttle drifts slow across the Energy Farm — patience is power');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (112, 2, 'Outer Zone winds whip through the server farm — expect beautiful chaos');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (126, 2, 'the N.S.S. Kanly drifts through the dead zone — rebirth emerges from abandonment');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (150, 2, 'Helix and Reboot Syndicate signals cross above the antenna array — speak, don''t fight');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (164, 2, 'the Blue Silver glow of refining promethium filters through the skylight — intuition sharpens');
--> statement-breakpoint

-- Group B: lore enrichment for generic fortunes
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (4, 1, 'beware Helix bearing gifts. nothing on Kepler-609c comes free');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (8, 1, 'a Ringer''s haul from the polar refineries brings unexpected wealth');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (12, 1, 'Kepler Sky Control clears your trajectory today. trade boldly');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (29, 1, 'the O.E.D. crew above casts a blessing on water signs. drink deep');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (30, 1, 'static between N3 segments carries a prophecy. tune in at dusk');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (37, 1, 'the Foodtronix on Main Drag owes you something. collect');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (41, 1, 'the fortune teller in Midtown Plaza has been waiting for you specifically');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (44, 1, 'the lift to upper Megablock One opens for you today. step in');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (50, 1, 'Rations Row reveals a hidden stall to those who wander');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (60, 1, 'the Maze prophecy favors scavengers today. search and prosper');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (74, 1, 'a child of the Maze carries wisdom older than the towers');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (89, 1, 'your NeoCreds account finds extra zeros today. don''t question it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (92, 1, 'the Cygnus wrench rises tonight — fix what has been broken');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (99, 1, 'the Maze astrologer says your chart is the rarest she''s seen');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (137, 1, 'the binary stars of the Cygnus federation orbit closer tonight — duality resolves');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (166, 1, 'the Kepler Spire picks up your frequency — the cosmos listens');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (210, 1, 'the neon zodiac wheel in the Core spins in your direction');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (253, 1, 'the memorial wall in Midtown Plaza glows for those who came before you. carry their light forward');
--> statement-breakpoint

-- Additional Neotropolis-flavored fortunes drawing on canon factions, drugs, and locales
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (5, 1, 'an old frequency from the Cygni Resistance reaches you today. listen carefully');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (32, 1, 'trust the Sentinel with kind eyes. they remember the Maze before the wall');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (75, 1, 'your NeoBand resonates at a frequency of pure luck today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (83, 1, 'the recycled air on Main Drag carries the scent of a Cult of ''84 memory worth revisiting');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (185, 1, 'the warmth of an NPC heating vent carries a grandmother''s blessing');
