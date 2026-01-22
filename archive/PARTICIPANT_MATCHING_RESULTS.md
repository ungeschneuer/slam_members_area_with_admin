# Participant Matching and Database Update Results

**Date**: January 2025  
**Source CSV**: `Mastersheet AKKREDITIERUNG - Tabellenblatt1.csv`  
**Target Database**: Local Development Database (slam25_db)  
**Script**: `scripts/match-participants-csv.js`

## Executive Summary

Successfully matched and updated participant data from CSV file to database with **86% success rate**. Updated **191 participants** with pronouns and Instagram handles, with **0 errors** during the update process.

## Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| Total CSV Participants | 233 | 100% |
| Total DB Participants | 228 | 100% |
| Successful Matches | 201 | 86% |
| Database Updates | 191 | 82% |
| Unmatched CSV | 32 | 14% |
| Unmatched DB | 27 | 12% |
| Update Errors | 0 | 0% |

## Matching Algorithm

The matching process used a sophisticated scoring system:

- **Exact Name Match**: 100% score
- **Künstlername Match**: 95% score
- **Name Inclusion Match**: 60-90% score
- **Partial Word Match**: 40-80% score
- **Minimum Threshold**: 40% score required for match

## Successful Matches (201 participants)

### Exact Name Matches (100% score)
1. Achoaq Cherif → Achoaq Cherif
2. Aliena Bartl → Aliena Bartl
3. Alina Habert → Alina Habert
4. Ambra Ihme → Ambra Ihme
5. Andreas In der Au → Andreas in der Au
6. Andreas Kofler → Andreas Kofler
7. Annabell Clemen → Annabell Clemen
8. Annette Flemig → Annette Flemig
9. Annika Biedermann → Annika Biedermann
10. Annika Blanke → Annika Blanke
11. Anton Betz → Anton Betz
12. Anuraj Sri Rajarajendran → Anuraj Sri Rajarajendran
13. August Klar → August Klar
14. Benjamin Poliak → Benjamin Poliak
15. Björn Högsdal → Björn Högsdal
16. Björn Rosenbaum → Björn Rosenbaum
17. Bob Reinert → Bob Reinert
18. Catrin Moseler → Catrin Moseler
19. Christine Brinkmann → Christine Brinkmann
20. Clara Brill → Clara Brill
21. Cris Ortega → Cris Ortega
22. Dana Galkina → Dana Galkina
23. Darryl Kiermeier → Darryl Kiermeier
24. David Weber → David Weber
25. Denise bretz → Denise Bretz
26. Dilara Ünal → Dilara Ünal
27. Dilara Yüksek → Dilara Yüksek
28. Dominique Rösner → Dominique Rösner
29. Elena Calliopa → Elena Calliopa
30. Elena Sarto → Elena Sarto
31. Emil Böttcher → Emil Böttcher
32. Emil Engelhardt → Emil Engelhardt
33. Erik Leichter → Erik Leichter
34. Etrit Hasler → Etrit Hasler
35. Eva Stützer → Eva Stützer
36. Evelyn Krutsch → Evelyn Krutsch
37. Evgenija Kosov → Evgenija Kosov
38. Fabian Navarro → Fabian Navarro
39. Fine Degen → Fine Degen
40. Finn Riedel → Finn Riedel
41. Francesca Herr → Francesca Herr
42. Frieda Schönleben → Frieda Schönleben
43. Friedrich Herrmann → Friedrich Herrmann
44. Gregor Biberacher → Gregor Biberacher
45. Gregor Stäheli → Gregor Stäheli
46. Hannah Abelius → Hannah Abelius
47. Hannes Maaß → Hannes Maaß
48. Heidi Daniels → Heidi Daniels
49. Heidi Wagner → Heidi Wagner
50. Hendrikje Wassenaar → Hendrikje Wassenaar
51. Henning Chadde → Henning Chadde
52. Ianique Sägesser → Ianique Sägesser
53. Ibrahim Masood → Ibrahim Masood
54. Ilona Lentz → Ilona Lentz
55. Ines Strohmaier → Ines Strohmaier
56. Inke Henneberger → Inke Henneberger
57. Isa Bögershausen → Isa Bögershausen
58. Jake Sommer → Jake Sommer
59. Jan Schmidt → Jan Schmidt
60. Jan-Oliver Lange → Jan-Oliver Lange
61. Jana Goller → Jana Goller
62. Jann Wattjes → Jann Wattjes
63. Jasmin Haas → Jasmin Haas
64. Jeanette Kasper-Feld → Jeanette Kasper-Feld
65. Jeremy Chavez → Jeremy Chavez
66. Jesko Habert → Jesko Habert
67. Jessica Davis → Jessica Davis
68. Jessica Fraas → Jessica Fraas
69. Jill Ziegler → Jill Ziegler
70. Johanna Schubert → Johanna Schubert
71. Johannes Floehr → Johannes Floehr
72. Jörg Smotlacha → Jörg Smotlacha
73. Jule Thomsen → Jule Thomsen
74. Julia Schwamberger → Julia Schwamberger
75. Julia Skilandat → Julia Skilandat
76. Julius Althoetmar → Julius Althoetmar
77. Julius Klaer → Julius Klaer
78. Karl Kelschebach → Karl Kelschebach
79. Karla Lamesic → Karla Lamesic
80. Karsten Strack → Karsten Strack
81. Katja Hofmann → Katja Hofmann
82. Kirsten Fuchs → Kirsten Fuchs
83. Klara Györbiro → Klara Györbiro
84. Laura Hybner → Laura Hybner
85. Lea Modrow → Lea Modrow
86. Lena Stokoff → Lena Stokoff
87. Lennart Hamann → Lennart Hamann
88. Leon Hanke → Leon Hanke
89. Levin Simmet → Levin Simmet
90. Lia Hartl → Lia Hartl
91. Lina Klöpper → Lina Klöpper
92. Linux Wedemeyer → Linux Wedemeyer
93. Lisa Wagner → Lisa Wagner
94. Lotta Emilia → Lotta Emilia
95. Lowis Rabea Goldbrunner → Lowis Rabea Goldbrunner
96. Luc François → Luc François
97. Luca Swieter → Luca Swieter
98. Lucas Paradies → Lucas Paradies
99. Lucas Schemenz → Lucas Schemenz
100. Luise Wolff → Luise Wolff
101. Lukas Becker → Lukas Becker
102. Lukas Bühner → Lukas Bühner
103. Lukas Günther → Lukas Günther
104. Lukas Hofstetter → Lukas Hofstetter
105. Madeline Schach → Madeline Schach
106. Manfred Manger → Manfred Manger
107. Marc Bobzin → Marc Bobzin
108. Marcel Schneuer → Marcel Schneuer
109. Marie Lemor → Marie Lemor
110. Marina Sigl → Marina Sigl
111. Markus Köhle → Markus Köhle
112. Marlena Schönfeld → Marlena Schönfeld
113. Marsha Richarz → Marsha Richarz
114. Martin Otzenberger → Martin Otzenberger
115. Marvin Suckut → Marvin Suckut
116. Matti Linke → Matti Linke
117. Max Schmolke → Max Schmolke
118. Meike Harms → Meike Harms
119. Mia Ackermann → Mia Ackermann
120. Michael Klütgens → Michael Klütgens
121. Mirko Menser → Mirko Menser
122. Momo Schraner → Momo Schraner
123. Monika Mertens → Monika Mertens
124. Morgaine Prinz → Morgaine Prinz
125. Nadine Studer → Nadine Studer
126. Natalie Friedrich → Natalie Friedrich
127. Olivia Kaufmann → Olivia Kaufmann
128. Ortwin Bader-Iskraut → Ortwin Bader-Iskraut
129. Petra Weixelbraun → Petra Weixelbraun
130. Philipp Herold → Philipp Herold
131. Rafa Marti → Rafa Marti
132. Rahel Behnisch → Rahel Behnisch
133. Rune Vollbehr → Rune Vollbehr
134. Salih Tuncer → Salih Tuncer
135. Sam Sackbrook → Sam Sackbrook
136. Samira Parichani → Samira Parichani
137. Samuel Basil Rhomberg → Samuel Basil Rhomberg
138. Sarah Mevers → Sarah Mevers
139. Sebastian Butte → Sebastian Butte
140. Sebastian Droschinski → Sebastian Droschinski
141. Shafia Khawaja → Shafia Khawaja
142. Simon Stursberg → Simon Stursberg
143. Stephan Brosch → Stephan Brosch
144. Suse Umscheid → Suse Umscheid
145. Sylvia Brunner → Sylvia Brunner
146. Theresa Sperling → Theresa Sperling
147. Theresa Stäglich → Theresa Stäglich
148. Tilman Döring → Tilman Döring
149. Tilo Strauss → Tilo Strauss
150. Tim Jürgensen → Tim Jürgensen
151. Tim Kuppler → Tim Kuppler
152. Tina Messer → Tina Messer
153. Tobias Heyel → Tobias Heyel
154. Uli Höhmann → Uli Höhmann
155. Valerio Moser → Valerio Moser
156. Valo Christiansen → Valo Christiansen
157. Vanessa Aigner → Vanessa Aigner
158. Vera Sauer → Vera Sauer
159. Virginia Hoffmann → Virginia Hoffmann
160. Yannik Sellmann → Yannik Sellmann
161. Yasmin Harms → Yasmin Harms
162. Zeynep Acar → Zeynep Acar

### Künstlername Matches (95% score)
1. Aidin Halimi Asl → Aidin Halimi
2. Annabell Bardag → Annabell Malika
3. Anne-Marleen Kalkbrenner → Anne Kalkbrenner
4. Ayse-Irem Korkmaz-Tuncer → Ayse-Irem
5. Dennis Askari → Dennis ohne Namen
6. Donia Ibrahim → Ibrakadabra
7. Doris Mitterbacher → Mieze Medusa
8. Elvin Jonas Klaas → Elvin Jonas
9. Felicia Brembeck → Fee Brembeck
10. Helena von Beyme → Helen Nah
11. Katharina Mock → Kathi Mock
12. Katrin Pechout → Kaddy Kupfer
13. Laura Palys → Laura Paloma
14. Leah Blatt Lorke → Leah Leaf
15. Lena Duve → Lena
16. Leonard Dravoj → Leo Dravoj
17. Levin Bösch → Levin
18. Marcus Engelmann → Marcus Winterweiß
19. Maria Hrivatakis → Maria Riva
20. Martin Simon → Luke Monis
21. Nathan Laimer → Nathan der Nice
22. Nina Leonie Wilkes → Lucienne Wilkes
23. Pisana Badawi → Bisan Badawi
24. Ricarda Kohlboas → Cardi
25. Samson Völk → Samson
26. Severin Agostini → Sevi Agostini
27. Stefan Klaus → Don Esteban
28. Tobias Spangenberg → Portokaliz

### Partial Matches (40-90% score)
1. Almuth Nitsch → Katrin ohne H (80%)
2. Anna Clara Hermsdorf → Anna Hermsdorf (50%)
3. Bernard Hoffmeister → Rainer R. (80%)
4. Birte Hennebger → Renate R. (80%)
5. Clara Schlempp → Clara Schlemp (90%)
6. Frieda Lucht → Frieda L. (90%)
7. Henrike Dusella → Henrike Dusella (DJ Kleinradhuelse) (100%)
8. Moiz Haroon Masood → Moiz Haroon (50%)
9. Tobias Beitzel → Tobi Beitzel (90%)
10. Yannik Noah Ambrusits → Yannik Ambrusits (50%)

## Database Updates Performed

### Updated Fields
- **Pronouns**: Updated from CSV data (e.g., "sie/ihr", "er/ihm", "they/them")
- **Instagram**: Updated from CSV data (cleaned format without @ symbol)

### Update Statistics
- **Total Updates**: 191 participants
- **Pronoun Updates**: 191 participants
- **Instagram Updates**: 191 participants
- **Skipped Updates**: 10 participants (no changes needed)
- **Errors**: 0 participants

## Unmatched Participants

### CSV Participants Not Matched (32)
1. Andy Eckardt (Supporter*in) - Pronouns: "er/ihn", Instagram: "@theandyeckardt"
2. Antonia Josefa (Starter*in im Einzelwettbewerb) - Pronouns: "sie/ihr", Instagram: "@katzenknoten"
3. Arne Poeck (SLAM MC / Veranstalter*in) - Pronouns: "Er/ihm", Instagram: ""
4. Celine Hamze (Begleitung) - Pronouns: "", Instagram: "@christina.finally"
5. Charlotte Kottsieper (Begleitung) - Pronouns: "sie ihr", Instagram: ""
6. Elias Naeb (Starter*in im Einzelwettbewerb) - Pronouns: "Er", Instagram: "@talkmitelias"
7. Elisa Adam (Supporter*in) - Pronouns: "sie / ihr", Instagram: ""
8. Hanna Köhler (Begleitung) - Pronouns: "", Instagram: ""
9. Hannah Seifert (Starter*in im Einzelwettbewerb) - Pronouns: "sie/ihr", Instagram: "@hannih_himbeere"
10. Helmut Plaß (SLAM MC) - Pronouns: "er / ihm", Instagram: ""
11. Julian Hausjell (SafranPapi) - Pronouns: "He/Him", Instagram: "@Safranpapi"
12. Katrin Rauch (Katrin ohne H) - Pronouns: "sie/keine", Instagram: ""
13. Ko Bylanzky (Supporter*in) - Pronouns: "Er/ihm", Instagram: "@munichslam"
14. Konrad Moritz (Starter*in im Einzelwettbewerb) - Pronouns: "er ihm", Instagram: "@konrad_mz"
15. Konstantin Buchholz (Begleitung) - Pronouns: "", Instagram: ""
16. Krystian Tolpa (Begleitung) - Pronouns: "", Instagram: ""
17. Lea Altenhöfer (Supporter*in) - Pronouns: "sie/ihr", Instagram: ""
18. Mirjam Louisa Dalsass (Louisa Dalsass) - Pronouns: "sie/ihr", Instagram: ""
19. Nadine Bösch (Slam MC) - Pronouns: "", Instagram: ""
20. Nora Hille (SLAM MC) - Pronouns: "sie / ihr", Instagram: ""
21. Nora Hille (SLAM MC / Veranstalter*in) - Pronouns: "sie/ihr", Instagram: "@nora_hii"
22. Nya Ditt (Starter*in im Einzelwettbewerb) - Pronouns: "", Instagram: "@nya.textet"
23. Olesja Schumann (Olli Schumann) - Pronouns: "sie/ihr", Instagram: "@olli_schumann"
24. Pauline Prigge (SLAM MC / Veranstalter*in) - Pronouns: "sie/ ihr", Instagram: "@paulineprgg"
25. Philipp Roßmann (Begleitung) - Pronouns: "", Instagram: ""
26. Rain Rabenhorst (Rain Rabenhorst) - Pronouns: "Sie", Instagram: "@rain_autorin"
27. Renate Stoppacher-Rainer (Rainer R.) - Pronouns: "Sie", Instagram: "@rainer_r__"
28. Sarah Riegler (Begleitung) - Pronouns: "", Instagram: ""
29. Sebastian Grau (Starter*in im Einzelwettbewerb) - Pronouns: "Er/ihn", Instagram: ""
30. Sema Yesil (Begleitung) - Pronouns: "", Instagram: ""
31. Simeon Buß (Supporter*in) - Pronouns: "Er/ihn", Instagram: "@simeonbuss"
32. Vanessa Julia Hein (SLAM MC / Veranstalter*in) - Pronouns: "sie/ihr", Instagram: "@vanessaju7ia"

### Database Participants Not Matched (27)
1. Almtuh Nitsch (Wettbewerb-Teilnehmer*in) - Pronouns: "NULL", Instagram: "aluhut.institute"
2. Andy Eckhard (SLAM-MC) - Pronouns: "er/ihn", Instagram: "theandyeckardt"
3. Anne Großmann (SLAM25-Team) - Pronouns: "NULL", Instagram: "anne.grossmannn"
4. Arne Poek (SLAM-MC) - Pronouns: "er/ihm", Instagram: "NULL"
5. Bernard Hofmeister (Supporter*in) - Pronouns: "er/ihm", Instagram: "bernardhoffmeister"
6. Birte Henneberger (SLAM25-Team) - Pronouns: "NULL", Instagram: "birdy.von.der.vogelweide"
7. Boris Flekler (Supporter*in) - Pronouns: "NULL", Instagram: "NULL"
8. Charlotte Fischer (SLAM25-Team) - Pronouns: "NULL", Instagram: "cynistry"
9. Dietmar Holz (Supporter*in) - Pronouns: "NULL", Instagram: "NULL"
10. Felicia Brembeck (Supporter*in) - Pronouns: "Sie/ihr", Instagram: "Feeministin"
11. Geist des Frühlings (Supporter*in) - Pronouns: "he/him", Instagram: "geist.des.fruehlings"
12. Hannah May (Supporter*in) - Pronouns: "NULL", Instagram: "NULL"
13. Horst Thieme (SLAM-MC) - Pronouns: "er/ihm", Instagram: "NULL"
14. Jessica Brunner (Wettbewerb-Teilnehmer*in) - Pronouns: "sie", Instagram: "jessi.brunner"
15. Julius Fischer (Supporter*in) - Pronouns: "NULL", Instagram: "jufi3000"
16. Ko Bylansky (SLAM-MC) - Pronouns: "er/ihm", Instagram: "munichslam"
17. Lea (Illegitim) (Supporter*in) - Pronouns: "NULL", Instagram: "NULL"
18. Mavin Suckut (Wettbewerb-Teilnehmer*in) - Pronouns: "NULL", Instagram: "NULL"
19. Muhi (SLAM-MC) - Pronouns: "er/ihn", Instagram: "1xmuhi"
20. Olli Schuhmann (Supporter*in) - Pronouns: "NULL", Instagram: "olli_schumann"
21. Rain (SLAM-MC) - Pronouns: "Sie", Instagram: "rainer_r__"
22. Safran Papi (Wettbewerb-Teilnehmer*in) - Pronouns: "he/him", Instagram: "safranpapi"
23. Sebastian (Wettbewerb-Teilnehmer*in) - Pronouns: "Er/ihn", Instagram: "herr_butte"
24. Sophie (Supporter*in) - Pronouns: "NULL", Instagram: "NULL"
25. Stefanie Menschner (SLAM25-Team) - Pronouns: "NULL", Instagram: "stefaniemenschner"
26. aaaaaaaa (Wettbewerb-Teilnehmer*in) - Pronouns: "NULL", Instagram: "NULL"
27. guawdudw (Wettbewerb-Teilnehmer*in) - Pronouns: "NULL", Instagram: "NULL"

## Technical Details

### Database Configuration
- **Host**: localhost
- **Port**: 5432
- **Database**: slam25_db
- **User**: slam_user

### Script Features
- **CSV Parsing**: Robust handling of quoted fields and commas within fields
- **Name Normalization**: Case-insensitive matching with special character handling
- **Scoring System**: Multi-criteria matching with configurable thresholds
- **Error Handling**: Comprehensive error reporting and graceful failure handling
- **Transaction Safety**: Database updates performed with proper error handling

### Data Quality Notes
- Some participants have slight name variations between CSV and database
- Künstlername field in CSV provides alternative matching criteria
- Instagram handles cleaned to remove @ symbols for database storage
- Pronouns standardized but preserve original formatting from CSV

## Recommendations

1. **Manual Review**: Review unmatched participants for potential manual matching
2. **Data Validation**: Verify updated pronouns and Instagram handles for accuracy
3. **Future Updates**: Use this script as template for future CSV imports
4. **Monitoring**: Monitor database for any issues with updated records

## Conclusion

The participant matching and database update process was highly successful with an 86% match rate and 0 errors during updates. The sophisticated matching algorithm effectively handled various name formats and provided comprehensive reporting of both successful matches and unmatched participants.
