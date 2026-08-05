# Location normalize 2026-08-04

- Rows scanned: 8390
- Already canonical: 8388
- Changed: 2 (applied)
- Emptied (junk or unmapped): 0

## Top canonical values (post-normalize count among scanned)

- 1868 `Ottawa, ON`
- 1194 `Toronto, ON`
- 703 `St. Catharines, ON`
- 303 `Winnipeg, MB`
- 233 `Montreal, QC`
- 215 `Mississauga, ON`
- 210 `Edmonton, AB`
- 202 `Vancouver, BC`
- 190 `London, ON`
- 187 `Waterloo, ON`
- 162 `Hamilton, ON`
- 125 `Guelph, ON`
- 113 `Kamloops, BC`
- 110 `Calgary, AB`
- 104 `Saskatoon, SK`
- 93 `Halifax, NS`
- 90 `Greater Vancouver, BC`
- 85 `Victoria, BC`
- 84 `Oakville, ON`
- 69 `Newmarket, ON`
- 68 `Burnaby, BC`
- 63 `Thunder Bay, ON`
- 53 `Kelowna, BC`
- 49 `Markham, ON`
- 49 `Windsor, ON`

## Sample rewrites

- `Calgary, AB; Cold Lake, AB; Edmonton, AB; Suffield, AB; Wainwright, AB; Chilliwack, BC; Comox, BC; Esquimalt, BC; Shilo, MB; Winnipeg, MB; Gagetown, NB; Gander, NL; Happy Valley-Goose Bay, NL; Yellowknife, NT; Greenwood, NS; Halifax, NS; Alert, NU; Borden, ON; Kingston, ON; North Bay, ON; Ottawa, ON; Petawawa, ON; Toronto, ON; Trenton, ON; Bagotville (québec), YT; Montréal Island (québec), YT; Saint-Jean-Sur-Richelieu (québec), YT; Valcartier (québec), YT; Dundurn, SK; Moose Jaw, SK; Whitehorse, YT` → `Calgary, AB; Cold Lake, AB; Edmonton, AB; Suffield, AB; Wainwright, AB; Chilliwack, BC; Comox, BC; Esquimalt, BC; Shilo, MB; Winnipeg, MB; Gagetown, NB; Gander, NL; Happy Valley-Goose Bay, NL; Yellowknife, NT; Greenwood, NS; Halifax, NS; Alert, NU; Borden, ON; Kingston, ON; North Bay, ON; Ottawa, ON; Petawawa, ON; Toronto, ON; Trenton, ON; Bagotville, QC; Montréal Island, QC; Saint-Jean-Sur-Richelieu, QC; Valcartier, QC; Dundurn, SK; Moose Jaw, SK; Whitehorse, YT`
- `Victoria, BC; Vancouver, BC; Edmonton, AB; Calgary, AB; Saskatoon, SK; Regina, SK; Winnipeg, MB; Ottawa, ON; Toronto, ON; Montreal (québec), NL; Moncton, NB; Halifax, NS; St. John’s, NL` → `Victoria, BC; Vancouver, BC; Edmonton, AB; Calgary, AB; Saskatoon, SK; Regina, SK; Winnipeg, MB; Ottawa, ON; Toronto, ON; Montreal, QC; Moncton, NB; Halifax, NS; St. John’s, NL`
