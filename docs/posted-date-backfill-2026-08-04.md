# Posted date backfill — 2026-08-04

Extracted calendar posted dates from `raw_jobs.raw_text` into empty `posted_at` fields.

Updated: 340 rows.

## Patterns

- `Date Posted:` / `Date Posted (YYYY/MM/DD):` / `Date Posted By`
- `Posting Date:`
- `Posted:` / `Posted on` / `Posted On:` (with optional weekday)
- Two-digit years (`07/13/26` → `2026-07-13`)
- Skips relative Workday noise (`Posted 30+ Days Ago`)

## By source

- Dalhousie University: 55
- British Columbia Institute of Technology: 45
- Douglas College: 41
- McMaster University: 38
- University of Lethbridge: 35
- Cambrian College: 28
- Loyalist College: 22
- Regional Municipality of Wood Buffalo: 21
- Bruce County: 18
- Confederation College: 10
- City of Welland: 8
- Seneca College: 4
- Essex County: 4
- Carleton University: 4
- Government of Canada: 3
- Mohawk College: 2
- Region of Waterloo: 1
- TransLink: 1

## Job IDs

```
2411398	2026-02-09
f04eeee7225b	2026-06-16
ff577aa24865	2025-07-23
e165814105c4	2026-06-16
2441548	2026-06-26
2441547	2026-06-26
e8988aa231ab	2026-07-02
3f3202b05307	2026-07-10
601154517	2026-04-01
3381	2026-07-09
3380	2026-07-07
bd105aca2099	2026-05-22
5b73520323ec	2026-07-13
9a48404b417c	2026-07-13
4979356bbdb5	2026-07-13
43727ba0a61e	2026-07-10
0de0504e9d0a	2026-07-16
psft_20260429	2026-05-20
1290870547	2026-05-27
1291071047	2026-05-19
1290988047	2026-07-25
1290763747	2026-07-25
1291183447	2026-07-25
1291300347	2026-07-14
1291395747	2026-07-25
1291396147	2026-07-25
1291395047	2026-07-25
1291395947	2026-07-25
1291395847	2026-07-25
1291393947	2026-07-25
1291393747	2026-07-25
1291285747	2026-06-22
1291369447	2026-07-21
1291282747	2026-06-20
1291282647	2026-07-24
1291356047	2026-07-18
1290840947	2026-05-16
1290659647	2026-01-14
1290839747	2026-07-25
essex_JZflGHwYZw	2026-07-22
essex_qBXNIzXCD2	2026-07-22
essex_A6vkoZK5tI	2026-07-21
essex_HNuMbsW9o4	2026-07-20
8a2340fcd07f	2026-06-22
a80889e85079	2026-07-06
47b3008d79cf	2026-07-06
defbc06302ae	2026-07-06
3ce503742d0b	2026-07-06
19b49a2385a1	2026-07-06
30bb81b435fe	2026-07-06
fb34d305fa3c	2026-07-06
f8d71ce3e32a	2026-07-06
ba9b8bc14c85	2026-07-06
77b3fd499102	2026-07-06
959a4544a7d3	2026-07-21
a51e8f1ab708	2026-07-27
d1ed15d4810f	2026-07-27
65bf444c7b38	2026-07-06
2ab74d93223f	2026-07-23
735bf94088da	2026-07-23
16bc0eb6ca2b	2026-07-31
psft_77803	2026-07-31
psft_77780	2026-07-31
psft_77783	2026-07-30
psft_77731	2026-07-30
psft_77804	2026-07-30
psft_77800	2026-07-30
psft_77749	2026-07-29
psft_77542	2026-07-29
psft_77660	2026-07-29
psft_77648	2026-07-28
psft_77680	2026-07-28
psft_76302	2026-07-28
psft_77133	2026-07-24
psft_77656	2026-07-24
psft_77600	2026-07-24
psft_77450	2026-07-24
psft_77387	2026-07-24
psft_76958	2026-07-24
psft_77625	2026-07-23
psft_77630	2026-07-23
psft_77607	2026-07-23
psft_77561	2026-07-23
psft_77207	2026-07-23
psft_77041	2026-07-22
psft_77548	2026-07-22
psft_77468	2026-07-22
psft_77042	2026-07-22
psft_77044	2026-07-22
psft_77048	2026-07-22
psft_77047	2026-07-22
psft_77524	2026-07-22
psft_77410	2026-07-15
psft_77351	2026-07-13
psft_77350	2026-07-13
psft_77280	2026-07-13
psft_76531	2026-06-02
psft_74408	2026-02-27
psft_59682	2023-12-18
7281	2026-07-10
J0726-0156	2026-07-16
J0726-0191	2026-07-29
J0726-0095	2026-07-14
J0726-0192	2026-07-28
neogov_119209	2026-06-30
neogov_120825	2026-07-30
neogov_120790	2026-07-23
neogov_120776	2026-07-27
neogov_120565	2026-07-23
neogov_120830	2026-07-31
neogov_118679	2025-02-27
neogov_120763	2026-07-17
neogov_120804	2026-07-28
neogov_120652	2026-06-18
neogov_119426	2025-09-30
neogov_118702	2025-03-07
neogov_120757	2026-07-16
neogov_120498	2026-05-21
neogov_120828	2026-07-31
neogov_119425	2025-10-01
neogov_119422	2025-09-29
neogov_119337	2025-09-05
neogov_119795	2025-12-23
neogov_119793	2025-12-03
neogov_120400	2026-05-01
neogov_120316	2026-04-16
neogov_119794	2025-12-03
neogov_119789	2025-12-03
neogov_119792	2025-12-03
neogov_119443	2025-10-03
neogov_120398	2026-05-07
neogov_120397	2026-07-23
neogov_120829	2026-07-31
neogov_120659	2026-06-19
neogov_120631	2026-06-16
neogov_120633	2026-06-16
neogov_120604	2026-06-10
neogov_120382	2026-04-30
neogov_120394	2026-04-30
neogov_120395	2026-04-30
neogov_120392	2026-04-30
neogov_120396	2026-04-30
neogov_120363	2026-04-23
neogov_120348	2026-04-22
neogov_120273	2026-04-10
neogov_120172	2026-03-26
neogov_119976	2026-01-30
neogov_119974	2026-01-30
neogov_119733	2025-12-02
neogov_119734	2025-12-02
neogov_119662	2025-11-14
neogov_119638	2025-11-07
neogov_119274	2025-08-13
neogov_118308	2025-03-06
peopleadmin_dal_peopleadmin_ca_21934	2026-07-31
peopleadmin_dal_peopleadmin_ca_21930	2026-08-04
peopleadmin_dal_peopleadmin_ca_21927	2026-07-29
peopleadmin_dal_peopleadmin_ca_21926	2026-07-29
peopleadmin_dal_peopleadmin_ca_21925	2026-07-28
peopleadmin_dal_peopleadmin_ca_21924	2026-07-29
peopleadmin_dal_peopleadmin_ca_21922	2026-07-29
peopleadmin_dal_peopleadmin_ca_21921	2026-07-29
peopleadmin_dal_peopleadmin_ca_21918	2026-07-29
peopleadmin_dal_peopleadmin_ca_21917	2026-07-29
peopleadmin_dal_peopleadmin_ca_21914	2026-07-29
peopleadmin_dal_peopleadmin_ca_21911	2026-07-28
peopleadmin_dal_peopleadmin_ca_21909	2026-07-28
peopleadmin_dal_peopleadmin_ca_21908	2026-07-28
peopleadmin_dal_peopleadmin_ca_21907	2026-07-28
peopleadmin_dal_peopleadmin_ca_21903	2026-07-28
peopleadmin_dal_peopleadmin_ca_21902	2026-07-28
peopleadmin_dal_peopleadmin_ca_21901	2026-07-28
peopleadmin_dal_peopleadmin_ca_21900	2026-07-28
peopleadmin_dal_peopleadmin_ca_21892	2026-07-27
peopleadmin_dal_peopleadmin_ca_21891	2026-07-28
peopleadmin_dal_peopleadmin_ca_21885	2026-07-10
peopleadmin_dal_peopleadmin_ca_21882	2026-07-27
peopleadmin_dal_peopleadmin_ca_21881	2026-07-27
peopleadmin_dal_peopleadmin_ca_21880	2026-07-27
peopleadmin_dal_peopleadmin_ca_21878	2026-07-09
peopleadmin_dal_peopleadmin_ca_21877	2026-07-27
peopleadmin_dal_peopleadmin_ca_21876	2026-07-27
peopleadmin_dal_peopleadmin_ca_21875	2026-07-27
peopleadmin_dal_peopleadmin_ca_21874	2026-07-27
peopleadmin_dal_peopleadmin_ca_21873	2026-07-27
peopleadmin_dal_peopleadmin_ca_21872	2026-07-27
peopleadmin_dal_peopleadmin_ca_21871	2026-07-27
peopleadmin_dal_peopleadmin_ca_21870	2026-07-27
peopleadmin_dal_peopleadmin_ca_21869	2026-07-27
peopleadmin_dal_peopleadmin_ca_21863	2026-07-27
peopleadmin_dal_peopleadmin_ca_21860	2026-07-27
peopleadmin_dal_peopleadmin_ca_21858	2026-07-27
peopleadmin_dal_peopleadmin_ca_21843	2026-07-24
peopleadmin_dal_peopleadmin_ca_21842	2026-07-24
peopleadmin_dal_peopleadmin_ca_21841	2026-07-24
peopleadmin_dal_peopleadmin_ca_21836	2026-06-03
peopleadmin_dal_peopleadmin_ca_21835	2026-06-03
peopleadmin_dal_peopleadmin_ca_21830	2026-07-24
peopleadmin_dal_peopleadmin_ca_21797	2026-07-22
peopleadmin_dal_peopleadmin_ca_21796	2026-07-22
peopleadmin_dal_peopleadmin_ca_21779	2026-07-09
peopleadmin_dal_peopleadmin_ca_21693	2026-07-15
peopleadmin_dal_peopleadmin_ca_21619	2026-06-12
peopleadmin_dal_peopleadmin_ca_21211	2026-05-15
peopleadmin_dal_peopleadmin_ca_21210	2026-05-11
peopleadmin_dal_peopleadmin_ca_21017	2026-05-05
peopleadmin_dal_peopleadmin_ca_20973	2026-03-19
peopleadmin_dal_peopleadmin_ca_20807	2026-04-06
peopleadmin_dal_peopleadmin_ca_17151	2022-07-19
peopleadmin_uleth_peopleadmin_ca_9271	2026-07-31
peopleadmin_uleth_peopleadmin_ca_9265	2026-07-13
peopleadmin_uleth_peopleadmin_ca_9264	2026-07-30
peopleadmin_uleth_peopleadmin_ca_9262	2026-07-29
peopleadmin_uleth_peopleadmin_ca_9260	2026-07-28
peopleadmin_uleth_peopleadmin_ca_9258	2026-07-01
peopleadmin_uleth_peopleadmin_ca_9257	2026-07-06
peopleadmin_uleth_peopleadmin_ca_9256	2026-07-22
peopleadmin_uleth_peopleadmin_ca_9253	2025-07-14
peopleadmin_uleth_peopleadmin_ca_9252	2025-07-08
peopleadmin_uleth_peopleadmin_ca_9250	2026-07-20
peopleadmin_uleth_peopleadmin_ca_9247	2026-07-20
peopleadmin_uleth_peopleadmin_ca_9243	2026-07-17
peopleadmin_uleth_peopleadmin_ca_9242	2026-07-17
peopleadmin_uleth_peopleadmin_ca_9240	2026-07-17
peopleadmin_uleth_peopleadmin_ca_9231	2026-07-15
peopleadmin_uleth_peopleadmin_ca_9229	2026-07-15
peopleadmin_uleth_peopleadmin_ca_9226	2026-07-14
peopleadmin_uleth_peopleadmin_ca_9223	2026-07-13
peopleadmin_uleth_peopleadmin_ca_9219	2026-06-23
peopleadmin_uleth_peopleadmin_ca_9210	2026-07-09
peopleadmin_uleth_peopleadmin_ca_9206	2026-07-07
peopleadmin_uleth_peopleadmin_ca_9163	2026-06-03
peopleadmin_uleth_peopleadmin_ca_9160	2026-05-29
peopleadmin_uleth_peopleadmin_ca_9158	2026-05-25
peopleadmin_uleth_peopleadmin_ca_9146	2026-05-19
peopleadmin_uleth_peopleadmin_ca_9134	2026-05-05
peopleadmin_uleth_peopleadmin_ca_9073	2026-04-10
peopleadmin_uleth_peopleadmin_ca_9064	2026-02-12
peopleadmin_uleth_peopleadmin_ca_9054	2026-03-27
peopleadmin_uleth_peopleadmin_ca_8988	2026-02-10
peopleadmin_uleth_peopleadmin_ca_8910	2023-06-28
peopleadmin_uleth_peopleadmin_ca_8909	2026-01-19
peopleadmin_uleth_peopleadmin_ca_8841	2025-12-10
peopleadmin_uleth_peopleadmin_ca_8166	2023-01-24
peopleadmin_confederationcollege_peopleadmin_ca_6500	2026-07-31
peopleadmin_confederationcollege_peopleadmin_ca_6487	2026-07-23
peopleadmin_confederationcollege_peopleadmin_ca_5407	2023-06-29
peopleadmin_confederationcollege_peopleadmin_ca_5035	2023-07-10
peopleadmin_confederationcollege_peopleadmin_ca_5034	2023-07-10
peopleadmin_confederationcollege_peopleadmin_ca_5033	2023-07-10
peopleadmin_confederationcollege_peopleadmin_ca_5032	2023-06-29
peopleadmin_confederationcollege_peopleadmin_ca_5031	2023-06-29
peopleadmin_confederationcollege_peopleadmin_ca_5030	2023-06-29
peopleadmin_confederationcollege_peopleadmin_ca_4785	2023-12-08
peopleadmin_careers_bcit_ca_10603	2026-08-01
peopleadmin_careers_bcit_ca_10601	2025-05-14
peopleadmin_careers_bcit_ca_10598	2026-05-02
peopleadmin_careers_bcit_ca_10597	2026-06-17
peopleadmin_careers_bcit_ca_10594	2026-07-29
peopleadmin_careers_bcit_ca_10593	2026-07-29
peopleadmin_careers_bcit_ca_10592	2026-07-29
peopleadmin_careers_bcit_ca_10589	2026-07-29
peopleadmin_careers_bcit_ca_10588	2026-07-25
peopleadmin_careers_bcit_ca_10586	2026-07-25
peopleadmin_careers_bcit_ca_10582	2026-07-25
peopleadmin_careers_bcit_ca_10581	2026-07-25
peopleadmin_careers_bcit_ca_10575	2026-07-22
peopleadmin_careers_bcit_ca_10574	2026-07-18
peopleadmin_careers_bcit_ca_10573	2026-07-18
peopleadmin_careers_bcit_ca_10572	2026-07-18
peopleadmin_careers_bcit_ca_10571	2026-07-18
peopleadmin_careers_bcit_ca_10570	2026-07-18
peopleadmin_careers_bcit_ca_10569	2026-07-18
peopleadmin_careers_bcit_ca_10567	2025-05-28
peopleadmin_careers_bcit_ca_10560	2026-07-18
peopleadmin_careers_bcit_ca_10547	2026-07-15
peopleadmin_careers_bcit_ca_10523	2026-06-20
peopleadmin_careers_bcit_ca_10511	2026-06-13
peopleadmin_careers_bcit_ca_10510	2026-04-29
peopleadmin_careers_bcit_ca_10508	2025-01-11
peopleadmin_careers_bcit_ca_10507	2021-05-29
peopleadmin_careers_bcit_ca_10506	2021-05-29
peopleadmin_careers_bcit_ca_10505	2021-05-29
peopleadmin_careers_bcit_ca_10504	2021-05-29
peopleadmin_careers_bcit_ca_10503	2020-02-29
peopleadmin_careers_bcit_ca_10486	2026-06-24
peopleadmin_careers_bcit_ca_10483	2026-06-20
peopleadmin_careers_bcit_ca_10480	2026-06-20
peopleadmin_careers_bcit_ca_10467	2026-05-02
peopleadmin_careers_bcit_ca_10454	2026-05-27
peopleadmin_careers_bcit_ca_10449	2026-01-10
peopleadmin_careers_bcit_ca_10447	2026-01-28
peopleadmin_careers_bcit_ca_10446	2025-03-01
peopleadmin_careers_bcit_ca_10445	2026-01-14
peopleadmin_careers_bcit_ca_10444	2025-05-24
peopleadmin_careers_bcit_ca_10443	2025-05-24
peopleadmin_careers_bcit_ca_10442	2025-07-26
peopleadmin_careers_bcit_ca_10441	2025-03-15
peopleadmin_careers_bcit_ca_10404	2025-08-30
peopleadmin_www_douglascollegecareers_ca_15602	2026-07-31
peopleadmin_www_douglascollegecareers_ca_15598	2026-07-31
peopleadmin_www_douglascollegecareers_ca_15597	2026-07-31
peopleadmin_www_douglascollegecareers_ca_15596	2026-07-31
peopleadmin_www_douglascollegecareers_ca_15594	2026-07-15
peopleadmin_www_douglascollegecareers_ca_15592	2026-07-30
peopleadmin_www_douglascollegecareers_ca_15591	2026-07-29
peopleadmin_www_douglascollegecareers_ca_15586	2026-07-29
peopleadmin_www_douglascollegecareers_ca_15585	2026-07-29
peopleadmin_www_douglascollegecareers_ca_15584	2026-07-29
peopleadmin_www_douglascollegecareers_ca_15582	2026-05-27
peopleadmin_www_douglascollegecareers_ca_15577	2026-07-28
peopleadmin_www_douglascollegecareers_ca_15574	2026-07-22
peopleadmin_www_douglascollegecareers_ca_15565	2026-07-20
peopleadmin_www_douglascollegecareers_ca_15563	2026-07-20
peopleadmin_www_douglascollegecareers_ca_15562	2026-07-21
peopleadmin_www_douglascollegecareers_ca_15560	2026-07-22
peopleadmin_www_douglascollegecareers_ca_15546	2026-06-24
peopleadmin_www_douglascollegecareers_ca_15537	2026-06-12
peopleadmin_www_douglascollegecareers_ca_15535	2026-07-16
peopleadmin_www_douglascollegecareers_ca_15519	2026-07-13
peopleadmin_www_douglascollegecareers_ca_15508	2026-06-29
peopleadmin_www_douglascollegecareers_ca_15501	2026-07-06
peopleadmin_www_douglascollegecareers_ca_15500	2026-07-06
peopleadmin_www_douglascollegecareers_ca_15492	2026-06-26
peopleadmin_www_douglascollegecareers_ca_15491	2026-06-26
peopleadmin_www_douglascollegecareers_ca_15486	2026-05-15
peopleadmin_www_douglascollegecareers_ca_15454	2026-06-25
peopleadmin_www_douglascollegecareers_ca_15438	2026-06-22
peopleadmin_www_douglascollegecareers_ca_15405	2025-12-29
peopleadmin_www_douglascollegecareers_ca_15393	2026-05-04
peopleadmin_www_douglascollegecareers_ca_15338	2025-08-07
peopleadmin_www_douglascollegecareers_ca_15337	2026-05-15
peopleadmin_www_douglascollegecareers_ca_15274	2026-03-25
peopleadmin_www_douglascollegecareers_ca_15272	2026-05-04
peopleadmin_www_douglascollegecareers_ca_15246	2026-03-13
peopleadmin_www_douglascollegecareers_ca_15073	2026-02-13
peopleadmin_www_douglascollegecareers_ca_14987	2025-12-16
peopleadmin_www_douglascollegecareers_ca_14729	2025-06-06
peopleadmin_www_douglascollegecareers_ca_14711	2025-07-22
peopleadmin_www_douglascollegecareers_ca_14010	2023-02-14
```
