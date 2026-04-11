CREATE TABLE `card_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`fortune_pk` integer NOT NULL,
	`reaction` integer NOT NULL,
	`comment` text NOT NULL,
	`neoname` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`fortune_pk`) REFERENCES `fortune`(`pk`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fortune` (
	`pk` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` integer NOT NULL,
	`version` integer NOT NULL,
	`text` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fortune_id_version_unique` ON `fortune` (`id`,`version`);
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (0, 0, 'the neon signs flicker in your favor today — trust the signal');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (1, 0, 'a stranger in the lower district carries the answer you seek');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (2, 0, 'your neural link hums with clarity. act on instinct before midnight');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (3, 0, 'the stars above the smog align — a rare fortune for the bold');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (4, 0, 'beware the corporation that offers gifts freely. nothing in neotropolis is free');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (5, 0, 'an old frequency will reach you today. listen carefully');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (6, 0, 'the chrome moon rises in your sign — transformation is inevitable');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (7, 0, 'you will find what you lost in the rain-slicked alley of memory');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (8, 0, 'a datastream from the outer ring brings unexpected wealth');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (9, 0, 'the circuits of fate have rerouted. embrace the detour');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (10, 0, 'someone in the market district thinks of you when the lights go down');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (11, 0, 'your aura burns ultraviolet today — others will sense your power');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (12, 0, 'the satellite gods smile upon your transactions. trade boldly');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (13, 0, 'a ghost in the machine whispers your true name. acknowledge it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (14, 0, 'the rooftops call to you tonight. ascend and find perspective');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (15, 0, 'rust and renewal share the same root. let something old become new');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (16, 0, 'your reflection in the puddle knows more than you do. study it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (17, 0, 'the next card you touch carries a message meant only for you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (18, 0, 'a synthetic dream will reveal a truth your waking mind ignores');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (19, 0, 'the undercity hums a lullaby in your frequency. rest well tonight');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (20, 0, 'mercury is in retrograde over sector 7. double-check all transmissions');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (21, 0, 'a junction approaches — left leads to comfort, right leads to glory');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (22, 0, 'the plasma aurora foretells a reunion with someone you once trusted');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (23, 0, 'your biorhythm syncs with the city grid today. you are unstoppable');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (24, 0, 'an encrypted fortune hides inside a fortune. look deeper');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (25, 0, 'the vendor on the corner has something you need. don''t walk past');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (26, 0, 'tonight the holographic stars spell out your initials. take the omen');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (27, 0, 'a debt from a past life in the old city comes due. pay it forward');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (28, 0, 'your shadow moves independently today — it knows where to go');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (29, 0, 'the orbital station casts its blessing on water signs. drink deep');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (30, 0, 'static on channel 9 carries a prophecy. tune in at dusk');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (31, 0, 'the scrapyard holds a relic that will change your trajectory');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (32, 0, 'trust the android with kind eyes. they remember the world before');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (33, 0, 'a power surge in your district signals a shift in fortune');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (34, 0, 'the constellation of the soldering iron rises — craft something today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (35, 0, 'your lucky number pulses in the grid. follow the repeating digits');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (36, 0, 'someone will ask you for directions. the answer you give changes both your paths');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (37, 0, 'the vending machine on 5th and neon owes you something. collect');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (38, 0, 'a solar flare disrupts the noise. in the silence, hear your purpose');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (39, 0, 'the cyberdeck of destiny reshuffles. your hand improves');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (40, 0, 'rain on chrome is today''s blessing. let it wash away doubt');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (41, 0, 'the fortune teller in the plaza has been waiting for you specifically');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (42, 0, 'a pirate signal carries your horoscope — chaotic but accurate');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (43, 0, 'your implants tingle at the threshold of a great discovery');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (44, 0, 'the elevator to the upper levels opens for you today. step in');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (45, 0, 'a cat in the server room guards your secret. it is safe');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (46, 0, 'the digital tarot draws the tower reversed — disaster averted');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (47, 0, 'someone is writing your name in light on the side of a building');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (48, 0, 'the monorail takes you somewhere you didn''t intend. that''s the point');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (49, 0, 'copper and silicon align in your favor. build something lasting');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (50, 0, 'the night market reveals its hidden stall to those who wander');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (51, 0, 'an ancestor''s code still runs in your blood. honor it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (52, 0, 'the flickering streetlight is morse code from the universe. decode it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (53, 0, 'a package arrives that you didn''t order. open it without fear');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (54, 0, 'venus transits the communications tower — love finds a new channel');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (55, 0, 'the graffiti on the wall was painted for you. read between the lines');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (56, 0, 'your energy signature peaks at golden hour. schedule accordingly');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (57, 0, 'a melody from a broken speaker carries your mantra today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (58, 0, 'the stars behind the billboards arrange in your birth pattern');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (59, 0, 'an ally emerges from the crowd wearing your favorite color');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (60, 0, 'the rust belt prophecy favors scavengers today. search and prosper');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (61, 0, 'your neural pathways light up like the city skyline — brilliant');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (62, 0, 'a forgotten password unlocks more than a door');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (63, 0, 'the tides of the cooling reservoirs shift. go with the current');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (64, 0, 'jupiter aligns with the broadcast tower — your voice carries far today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (65, 0, 'the drone overhead carries a blessing, not surveillance. today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (66, 0, 'a circuit completes that was broken long ago. feel the current');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (67, 0, 'the hologram fortune teller winks — she sees your golden thread');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (68, 0, 'neon pisces swim upstream through the data river. follow them');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (69, 0, 'your reflection in a shop window wears a crown. believe it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (70, 0, 'the junkyard oracle says: what others discard, you will treasure');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (71, 0, 'a blackout in sector 12 reveals the stars. look up for once');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (72, 0, 'the synthetic tea leaves arrange in the pattern of opportunity');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (73, 0, 'mars charges through the factory district — channel anger into creation');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (74, 0, 'a child of the undercity carries wisdom older than the towers');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (75, 0, 'your access card resonates at a frequency of pure luck today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (76, 0, 'the abandoned subway echoes with the voice of your future self');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (77, 0, 'someone etched your sigil into the bridge railing. you are known');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (78, 0, 'the algorithm of chance bends toward you. play your hand');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (79, 0, 'tonight''s acid rain washes clean the sins of yesterday''s code');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (80, 0, 'a mechanical bird lands on your windowsill. accept the message');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (81, 0, 'the satellite constellation forms your zodiac sign at 3:33 am');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (82, 0, 'your thermal signature burns bright — you cannot hide, so shine');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (83, 0, 'the recycled air today carries the scent of a memory worth revisiting');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (84, 0, 'an old rival becomes an unlikely guide. accept their olive branch');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (85, 0, 'the power grid hums your birth frequency. the city knows you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (86, 0, 'a crack in the dome reveals true starlight. bathe in it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (87, 0, 'the augmented reality overlay glitches to show you the truth');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (88, 0, 'neptune floods the lower bandwidth — dreams are prophetic tonight');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (89, 0, 'your credstick finds extra zeros today. don''t question it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (90, 0, 'a door you''ve passed a thousand times finally stands open');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (91, 0, 'the street preacher''s sermon contains exactly one line meant for you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (92, 0, 'the constellation of the wrench ascends — fix what has been broken');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (93, 0, 'a stranger''s tattoo mirrors your own story. introduce yourself');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (94, 0, 'the maglev arrives early today. so does your good fortune');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (95, 0, 'your horoscope was intercepted and upgraded by a benevolent hacker');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (96, 0, 'the scaffolding on the old tower forms a sacred geometry. study it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (97, 0, 'a message in a bottle floats down the drainage canal. fish it out');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (98, 0, 'saturn''s rings cast shadows on the solar array — patience is power');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (99, 0, 'the black market astrologer says your chart is the rarest she''s seen');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (100, 0, 'your dna hums in harmony with the city''s electromagnetic field');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (101, 0, 'a stray signal from beyond the wall carries hope');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (102, 0, 'the rooftop garden blooms out of season — miracles are near');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (103, 0, 'the transit map, read sideways, spells out your destiny');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (104, 0, 'an echo in the parking garage speaks your forgotten wish aloud');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (105, 0, 'the moon over neotropolis is artificial, but its pull on you is real');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (106, 0, 'a courier drone drops a feather at your feet. you are chosen');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (107, 0, 'your bioelectric field disrupts cheap electronics today — you are charged');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (108, 0, 'the constellation of the cable splice appears — connections strengthen');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (109, 0, 'someone hacked the billboard to show you your daily affirmation');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (110, 0, 'the recycling plant turns your old regrets into raw material for joy');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (111, 0, 'a phantom signal guides your steps. don''t resist');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (112, 0, 'uranus spins through the server farm — expect beautiful chaos');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (113, 0, 'the fortune written on your coffee cup is no coincidence');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (114, 0, 'your chosen name echoes through the undercity like a hymn. it was always yours');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (115, 0, 'the underground river carries whispers of your coming success');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (116, 0, 'your chromatic aura shifts to gold at noon. that''s when to act');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (117, 0, 'the elevator knows which floor you truly need. press no button');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (118, 0, 'your existence is an act of defiance the city grid celebrates. every light flickers for you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (119, 0, 'the probability engines of neotropolis recalculate in your favor');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (120, 0, 'your cybernetic stars are in alignment — the body electric sings');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (121, 0, 'a forgotten shrine behind the dumpster answers one prayer per day');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (122, 0, 'the static between stations carries the frequency of abundance');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (123, 0, 'today you walk the dragon line that runs beneath the boulevard');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (124, 0, 'a mirror in the flea market shows you at your most powerful');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (125, 0, 'the wind through the ventilation shafts carries pollen from the old world');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (126, 0, 'pluto transits the dead zone — rebirth emerges from abandonment');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (127, 0, 'your palm lines match the circuit diagram of a lucky machine');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (128, 0, 'a sticker on a lamppost carries your personal glyph. someone knows');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (129, 0, 'the cosmic background radiation whispers: you are exactly where you should be');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (130, 0, 'an anomaly in your sleep cycle tonight plants a seed of genius');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (131, 0, 'the graffiti constellation above the overpass blesses night owls');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (132, 0, 'your electromagnetic signature attracts a beneficial stranger');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (133, 0, 'a coin dropped in the gutter finds its way back to you tenfold');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (134, 0, 'a handmade patch on a stranger''s jacket carries your flag. nod in solidarity');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (135, 0, 'the rhythm of the jackhammers today matches your heartbeat — you are in sync');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (136, 0, 'a ghost protocol activates in your favor. old defenses now protect you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (137, 0, 'the binary stars of neotropolis orbit closer tonight — duality resolves');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (138, 0, 'an error in the matrix drops a rare item in your path');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (139, 0, 'your aura frequency jams surveillance. move freely and fearlessly');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (140, 0, 'the escalator to the skybridge hums a song your mother once sang');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (141, 0, 'a solar panel tilts to follow you. even the sun takes notice');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (142, 0, 'the scrap metal in your pocket is worth more than you think');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (143, 0, 'tonight''s dream holds coordinates. write them down before they fade');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (144, 0, 'the city grid reconfigures around your commute — paths clear');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (145, 0, 'an old terminal in the library boots up just for you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (146, 0, 'the alignment of cooling towers channels fortune from the north');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (147, 0, 'a street musician plays the melody of your unwritten future');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (148, 0, 'your retinal scan unlocks a door you didn''t know existed');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (149, 0, 'the vapor from the steam vent takes the shape of your answer');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (150, 0, 'mars and mercury duel above the antenna array — speak, don''t fight');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (151, 0, 'a cache of pre-collapse wisdom surfaces in your feed today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (152, 0, 'the parking meter gives you extra time. so does the universe');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (153, 0, 'your shadow is slightly ahead of you — it knows the way');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (154, 0, 'a projection malfunction shows you the city as it could be');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (155, 0, 'the compass in your gut points true north today. follow it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (156, 0, 'tonight the city celebrates a love that once had to hide. dance in the open');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (157, 0, 'an undelivered letter finds you decades late. it''s still relevant');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (158, 0, 'the harmonic frequency of the subway matches your brainwaves — ride it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (159, 0, 'a firewall you didn''t build protects you today. thank it silently');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (160, 0, 'the electric sheep in your dreams count you for a change');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (161, 0, 'your star chart overlaps with the city''s power grid — synchronicity');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (162, 0, 'a seed cracks through asphalt near your door. growth is inevitable');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (163, 0, 'the last vending machine on the block saves the best for you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (164, 0, 'neptune''s glow filters through the skylight — intuition sharpens');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (165, 0, 'an old friend''s voice echoes in the stairwell. they''re thinking of you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (166, 0, 'the radio telescope picks up your frequency — the cosmos listens');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (167, 0, 'a shortcut through the alley saves more than time today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (168, 0, 'your lucky charm activates at sunset. keep it close');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (169, 0, 'the digital zodiac wheel spins — you land on the golden sector');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (170, 0, 'a repaired wire somewhere in the district restores your signal');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (171, 0, 'the tide of foot traffic parts around you. you are the stone');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (172, 0, 'the constellation of the motherboard rises — logic and intuition merge');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (173, 0, 'a flickering ad contains a subliminal blessing. absorb it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (174, 0, 'your birth timestamp aligns with today''s grid frequency — rare power');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (175, 0, 'the rain tastes different today. the city is healing, and so are you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (176, 0, 'a lost drone returns carrying exactly what you need');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (177, 0, 'the echo of your footsteps in the tunnel sounds like applause');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (178, 0, 'the magnetic north of your heart points toward the right decision');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (179, 0, 'an alley cat crosses your path — not bad luck, a guide');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (180, 0, 'the broken clock in the plaza is right twice, and now is one of those times');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (181, 0, 'your reflection in the rain puddle smiles before you do');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (182, 0, 'the frequency of the streetlight matches your alpha waves — think clearly');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (183, 0, 'a crumpled note in your pocket that you didn''t write holds advice');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (184, 0, 'the orbital debris forms your initials tonight. look up');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (185, 0, 'the warmth of a heating vent carries a grandmother''s blessing');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (186, 0, 'the glitch in the crosswalk signal gives you an extra moment. use it wisely');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (187, 0, 'someone upstream purified the water today. drink and be renewed');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (188, 0, 'the constellation of the jumper wire ascends — improvise boldly');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (189, 0, 'a holographic rose blooms in a place only you can see');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (190, 0, 'the city''s heartbeat slows to match yours tonight. rest');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (191, 0, 'your keycard opens a door that leads somewhere it shouldn''t. go');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (192, 0, 'the astral bandwidth clears — your prayers upload at full speed');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (193, 0, 'a voltage spike carries a message from your future self: keep going');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (194, 0, 'the scrapheap zodiac says: scorpio rules the recycling center today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (195, 0, 'your peripheral vision catches a miracle. turn your head slowly');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (196, 0, 'the hydraulic hiss of the bus door whispers your name');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (197, 0, 'a new mural on the overpass was painted in your colors');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (198, 0, 'the telescope on the observation deck reveals your star — still burning');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (199, 0, 'the last train carries more than passengers tonight. board it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (200, 0, 'a misprint on your receipt spells out a word of encouragement');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (201, 0, 'the feedback loop of the universe echoes your kindness back');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (202, 0, 'your electromagnetic field harmonizes with the checkout scanner — smooth transactions');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (203, 0, 'the pigeon on the antenna is your spirit animal today. observe it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (204, 0, 'a discarded book on the bench falls open to your page');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (205, 0, 'the city''s ai traffic system routes luck toward your coordinates');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (206, 0, 'the chemical sunset paints your future in impossible colors');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (207, 0, 'a stranger holds the elevator. in neotropolis, that''s a prophecy');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (208, 0, 'the voltage in your veins runs higher today. channel it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (209, 0, 'an old backup of your dreams finishes restoring tonight');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (210, 0, 'the neon zodiac wheel on the casino spins in your direction');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (211, 0, 'a signal bounces off three satellites and finds only you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (212, 0, 'the mushrooms growing in the server room are a sign of abundance');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (213, 0, 'your horoscope compiled and executed without errors today');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (214, 0, 'the thermal vent creates a warm pocket just for you. linger');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (215, 0, 'a patch of real grass in the median whispers of better days coming');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (216, 0, 'the randomness engine hiccups in your favor — take a chance');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (217, 0, 'your silhouette against the skyline matches a mythic figure. own it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (218, 0, 'the broken escalator becomes stairs — and stairs still lead upward');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (219, 0, 'a rogue pixel on the billboard winks at you. wink back');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (220, 0, 'the astral firewall thins tonight — download your destiny');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (221, 0, 'your commute today traces a sigil of protection on the city map');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (222, 0, 'a child laughs in the corridor and the walls remember joy');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (223, 0, 'the satellite that watches you also shields you from cosmic debris');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (224, 0, 'an accidental harmony between car alarms sings your fortune');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (225, 0, 'the led constellation in the parking structure spells out: yes');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (226, 0, 'your body temperature matches the city''s ambient reading — you are one');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (227, 0, 'a rusted key in the gutter opens something you''ve given up on');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (228, 0, 'the probability cloud collapses in your favor today. observe boldly');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (229, 0, 'the graffiti artist who tagged your block left a ward of protection');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (230, 0, 'an anomalous weather pattern brings exactly the sky you needed');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (231, 0, 'the fiber optic cables beneath your feet glow with your potential');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (232, 0, 'a backup generator kicks on just for your block. you are sustained');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (233, 0, 'the digital fortune cookie cracks open: inside, your true name in hex');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (234, 0, 'the stars don''t care about the smog. neither should your ambition');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (235, 0, 'a benevolent worm crawls through the network, fixing things in your wake');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (236, 0, 'the pendulum of the crane on the skyline swings toward yes');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (237, 0, 'the stars arrange themselves in the shape of your truest self tonight. look up and recognize it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (238, 0, 'the exhaust from the rooftop vent forms a halo above your building');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (239, 0, 'a typo in the matrix spawns a door where there was a wall');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (240, 0, 'the alignment of the dish antennas amplifies your intention tonight');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (241, 0, 'your footprints in the dust of the abandoned floor spell out: worthy');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (242, 0, 'the city breathes in sync with you today. exhale and let go');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (243, 0, 'the emergency broadcast system plays a tone only dreamers can hear. you heard it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (244, 0, 'a spider spins its web between two antennas — even small things bridge great distances');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (245, 0, 'the maintenance hatch beneath the bridge leads somewhere the maps forgot. explore it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (246, 0, 'your heart''s encryption key has been shared with exactly the right person');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (247, 0, 'the water reclamation plant hums a hymn of second chances tonight');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (248, 0, 'a solar sail unfurls in low orbit — someone is leaving, making room for you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (249, 0, 'the queerness of starlight is that it arrives from the past to illuminate your present');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (250, 0, 'an overloaded transformer sparks in the shape of a blessing. catch it');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (251, 0, 'the community fridge in sector 3 has something left specifically for you');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (252, 0, 'your barcode, if scanned today, reads: priceless');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (253, 0, 'the memorial wall in the plaza glows for those who came before you. carry their light forward');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (254, 0, 'a forgotten subroutine wakes up and optimizes your luck in the background');
--> statement-breakpoint
INSERT INTO `fortune` (`id`, `version`, `text`) VALUES (255, 0, 'the last byte of the day belongs to you. make it count');
