SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict Qzsuq7eAdCAHuL6Jy2bdVTOBTpHn4c3nLycUkYO16rybh3d4kyRqH9EVvoTPgQv

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
\N	14022913-5c62-4219-8bcc-e1fa4ecb0ae3	\N	\N	admin@teste.com	$2a$06$ymphlYc6X6OFscZiQjWHLOTMC1rL8R6At2Eh/vKVC5IdBIcJKytpO	2026-05-07 18:01:18.974364+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	608bb5f2-fd68-41d3-b0bf-459d07838adb	authenticated	authenticated	admin1@teste.com	$2a$06$Pu/7i.XW6Gi2G0PFtmd2buVENg95lL22pXPAXNXMKWb.UomOJ.j46	2026-05-07 18:34:33.2943+00	\N		\N	72d73bf572ba2ac45c56ebafa36ba8a9ca687df517461c36bd591724	2026-05-13 23:09:49.567477+00			\N	2026-06-09 22:07:53.225091+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-05-07 18:34:33.283711+00	2026-06-09 23:08:13.901174+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	17eca69f-0320-4d26-8fe7-6047107b9201	authenticated	authenticated	fabycirino@monare.com	$2a$10$EcYXFwhvw12nZ7Fn5qZjTukfz.9Kk8WeCU6oIHAoa1rWufdeNYMVS	2026-06-01 21:25:04.15085+00	\N		\N		\N			\N	2026-06-08 01:00:04.598664+00	{"provider": "email", "providers": ["email"]}	{"display_name": "Fabiana Cirino", "email_verified": true}	\N	2026-06-01 21:25:04.119449+00	2026-06-08 01:00:04.627575+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	84f5e844-5448-4c95-b9f1-b9691ad4439c	authenticated	authenticated	teste@monare.com.br	$2a$10$x4T8Z95wb6B/RarpwmDKNOunKjBFId0g0u0owKJN1ZwSwVwct3u2i	2026-06-02 23:04:45.052073+00	\N		\N		\N			\N	2026-06-02 23:06:38.998642+00	{"provider": "email", "providers": ["email"]}	{"display_name": "teste", "email_verified": true}	\N	2026-06-02 23:04:45.00955+00	2026-06-02 23:06:39.004923+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	7151e6b4-838a-43f8-9442-b3b5bc476305	authenticated	authenticated	mismaandreza@monare.com	$2a$10$SHgEwI1RUD2PRZbUY0AmT.FnI40OxiiWI7sGr6WRtcMkiuuHQLXnG	2026-06-03 02:39:51.969065+00	\N		\N		\N			\N	2026-06-03 14:28:40.054003+00	{"provider": "email", "providers": ["email"]}	{"display_name": "Misma Andreza", "email_verified": true}	\N	2026-06-03 02:39:51.883712+00	2026-06-03 14:28:40.089609+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	38d0812a-a835-41da-8e50-a5e42d5bee73	authenticated	authenticated	julianarusso@monare.com	$2a$10$t5FG2JXgALkTV6gc0o0iROt2F3oAnx5iS7jeA2KE0SYIV7VfllxlO	2026-05-27 05:12:48.037432+00	\N		\N		\N			\N	2026-06-04 18:02:17.139738+00	{"provider": "email", "providers": ["email"]}	{"display_name": "Juliana Russo", "email_verified": true}	\N	2026-05-27 05:12:48.000424+00	2026-06-04 21:07:44.377773+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
608bb5f2-fd68-41d3-b0bf-459d07838adb	608bb5f2-fd68-41d3-b0bf-459d07838adb	{"sub": "608bb5f2-fd68-41d3-b0bf-459d07838adb", "email": "admin1@teste.com", "email_verified": false, "phone_verified": false}	email	2026-05-07 18:34:33.291746+00	2026-05-07 18:34:33.291826+00	2026-05-07 18:34:33.291826+00	2bbb2cb8-58bb-4d28-8dbb-b20cbacdbeb1
38d0812a-a835-41da-8e50-a5e42d5bee73	38d0812a-a835-41da-8e50-a5e42d5bee73	{"sub": "38d0812a-a835-41da-8e50-a5e42d5bee73", "email": "julianarusso@monare.com", "email_verified": false, "phone_verified": false}	email	2026-05-27 05:12:48.033275+00	2026-05-27 05:12:48.033332+00	2026-05-27 05:12:48.033332+00	d3371998-b358-4c06-9530-da18a9021463
17eca69f-0320-4d26-8fe7-6047107b9201	17eca69f-0320-4d26-8fe7-6047107b9201	{"sub": "17eca69f-0320-4d26-8fe7-6047107b9201", "email": "fabycirino@monare.com", "email_verified": false, "phone_verified": false}	email	2026-06-01 21:25:04.146927+00	2026-06-01 21:25:04.146982+00	2026-06-01 21:25:04.146982+00	9b874c48-0bf5-4cdb-8ed4-bb57dbbdd249
84f5e844-5448-4c95-b9f1-b9691ad4439c	84f5e844-5448-4c95-b9f1-b9691ad4439c	{"sub": "84f5e844-5448-4c95-b9f1-b9691ad4439c", "email": "teste@monare.com.br", "email_verified": false, "phone_verified": false}	email	2026-06-02 23:04:45.0467+00	2026-06-02 23:04:45.046774+00	2026-06-02 23:04:45.046774+00	c244d13f-ccc0-4145-abb8-2128e18e7520
7151e6b4-838a-43f8-9442-b3b5bc476305	7151e6b4-838a-43f8-9442-b3b5bc476305	{"sub": "7151e6b4-838a-43f8-9442-b3b5bc476305", "email": "mismaandreza@monare.com", "email_verified": false, "phone_verified": false}	email	2026-06-03 02:39:51.963757+00	2026-06-03 02:39:51.963818+00	2026-06-03 02:39:51.963818+00	b243e129-0293-4c57-aeec-447751928cf6
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
a7da8ae6-39d3-425f-aa71-33b4c018f886	17eca69f-0320-4d26-8fe7-6047107b9201	2026-06-08 01:00:04.600012+00	2026-06-08 01:00:04.600012+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1	45.189.251.77	\N	\N	\N	\N	\N
ce4f1b2a-61a2-419b-920d-97902527ef13	7151e6b4-838a-43f8-9442-b3b5bc476305	2026-06-03 14:28:40.055203+00	2026-06-03 14:28:40.055203+00	\N	aal1	\N	\N	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36	189.38.22.137	\N	\N	\N	\N	\N
249bc350-0bc1-4c21-8454-487cc2ba9b03	608bb5f2-fd68-41d3-b0bf-459d07838adb	2026-06-09 18:02:12.453458+00	2026-06-09 18:02:12.453458+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	187.94.84.222	\N	\N	\N	\N	\N
f19ebb2f-63a4-4a67-a5c5-45740c546e0e	608bb5f2-fd68-41d3-b0bf-459d07838adb	2026-06-08 23:16:46.024603+00	2026-06-09 22:28:42.282155+00	\N	aal1	\N	2026-06-09 22:28:42.282031	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	45.175.115.253	\N	\N	\N	\N	\N
1716a5e7-5e96-4627-968d-0a96dcbd0fee	608bb5f2-fd68-41d3-b0bf-459d07838adb	2026-06-09 22:07:53.226277+00	2026-06-09 23:08:13.922611+00	\N	aal1	\N	2026-06-09 23:08:13.92079	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	187.110.208.254	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
a7da8ae6-39d3-425f-aa71-33b4c018f886	2026-06-08 01:00:04.632423+00	2026-06-08 01:00:04.632423+00	password	5c3504b6-05c8-4df3-bf4b-f30a8b0d41a8
f19ebb2f-63a4-4a67-a5c5-45740c546e0e	2026-06-08 23:16:46.030607+00	2026-06-08 23:16:46.030607+00	password	4c9e2566-cc71-4b88-aebe-1183591423ca
249bc350-0bc1-4c21-8454-487cc2ba9b03	2026-06-09 18:02:12.489813+00	2026-06-09 18:02:12.489813+00	password	d66f28d6-3b8e-43b7-a58c-a086db90fdf0
1716a5e7-5e96-4627-968d-0a96dcbd0fee	2026-06-09 22:07:53.292298+00	2026-06-09 22:07:53.292298+00	password	d5b63070-8a29-45c3-8207-74d8a1da22fa
ce4f1b2a-61a2-419b-920d-97902527ef13	2026-06-03 14:28:40.091154+00	2026-06-03 14:28:40.091154+00	password	b82f56db-5874-4218-999a-8083672a4a39
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
23d87a5c-5819-4431-88b8-e374d5206b6a	608bb5f2-fd68-41d3-b0bf-459d07838adb	recovery_token	72d73bf572ba2ac45c56ebafa36ba8a9ca687df517461c36bd591724	admin1@teste.com	2026-05-13 23:09:50.062069	2026-05-13 23:09:50.062069
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	201	zwi52j5iy36x	608bb5f2-fd68-41d3-b0bf-459d07838adb	t	2026-06-08 23:16:46.02891+00	2026-06-09 00:20:32.998375+00	\N	f19ebb2f-63a4-4a67-a5c5-45740c546e0e
00000000-0000-0000-0000-000000000000	202	qb37hviuj45o	608bb5f2-fd68-41d3-b0bf-459d07838adb	t	2026-06-09 00:20:33.007732+00	2026-06-09 03:25:47.979933+00	zwi52j5iy36x	f19ebb2f-63a4-4a67-a5c5-45740c546e0e
00000000-0000-0000-0000-000000000000	203	5hecn5nlnlh6	608bb5f2-fd68-41d3-b0bf-459d07838adb	t	2026-06-09 03:25:47.994325+00	2026-06-09 15:01:21.558002+00	qb37hviuj45o	f19ebb2f-63a4-4a67-a5c5-45740c546e0e
00000000-0000-0000-0000-000000000000	204	jucdacclyawl	608bb5f2-fd68-41d3-b0bf-459d07838adb	t	2026-06-09 15:01:21.582803+00	2026-06-09 16:46:15.047133+00	5hecn5nlnlh6	f19ebb2f-63a4-4a67-a5c5-45740c546e0e
00000000-0000-0000-0000-000000000000	206	v475fd2dn5su	608bb5f2-fd68-41d3-b0bf-459d07838adb	f	2026-06-09 18:02:12.477432+00	2026-06-09 18:02:12.477432+00	\N	249bc350-0bc1-4c21-8454-487cc2ba9b03
00000000-0000-0000-0000-000000000000	205	vtf7gagaphuo	608bb5f2-fd68-41d3-b0bf-459d07838adb	t	2026-06-09 16:46:15.057174+00	2026-06-09 22:28:42.258601+00	jucdacclyawl	f19ebb2f-63a4-4a67-a5c5-45740c546e0e
00000000-0000-0000-0000-000000000000	208	7yj2jlvj2iff	608bb5f2-fd68-41d3-b0bf-459d07838adb	f	2026-06-09 22:28:42.267695+00	2026-06-09 22:28:42.267695+00	vtf7gagaphuo	f19ebb2f-63a4-4a67-a5c5-45740c546e0e
00000000-0000-0000-0000-000000000000	207	exzpdkslit2w	608bb5f2-fd68-41d3-b0bf-459d07838adb	t	2026-06-09 22:07:53.260814+00	2026-06-09 23:08:13.887046+00	\N	1716a5e7-5e96-4627-968d-0a96dcbd0fee
00000000-0000-0000-0000-000000000000	209	r5xrni4knlkf	608bb5f2-fd68-41d3-b0bf-459d07838adb	f	2026-06-09 23:08:13.893188+00	2026-06-09 23:08:13.893188+00	exzpdkslit2w	1716a5e7-5e96-4627-968d-0a96dcbd0fee
00000000-0000-0000-0000-000000000000	142	b2gp7uwdjm6l	7151e6b4-838a-43f8-9442-b3b5bc476305	f	2026-06-03 14:28:40.071816+00	2026-06-03 14:28:40.071816+00	\N	ce4f1b2a-61a2-419b-920d-97902527ef13
00000000-0000-0000-0000-000000000000	189	5gmtjesictkh	17eca69f-0320-4d26-8fe7-6047107b9201	f	2026-06-08 01:00:04.620561+00	2026-06-08 01:00:04.620561+00	\N	a7da8ae6-39d3-425f-aa71-33b4c018f886
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."categorias" ("id", "nome", "prefixo", "created_at") FROM stdin;
0654f8a2-7991-400e-b373-ef8205a8d92d	Brincos	BRINCO	2026-05-27 04:25:15.496112+00
2896ec17-6df4-4938-a511-014c9913ddaa	Pulseira	PULSEI	2026-05-27 04:25:50.266425+00
b0b52ad2-89e8-41b7-b4ea-7871a290f553	TESTE	TESTE	2026-05-27 05:26:37.175261+00
e88de192-da1e-43b4-88b9-0b5b077ab109	Colar	COLAR	2026-06-02 22:23:55.53327+00
a09a5d33-b3ad-4b67-9dea-93bddf9f092d	Tornozeleira	TORNOZ	2026-06-02 22:36:33.856808+00
f8d18174-a958-4868-84ce-f8e0f9583b99	Anéis	ANÉIS	2026-06-03 02:56:13.802693+00
\.


--
-- Data for Name: ciclos_mostruario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ciclos_mostruario" ("id", "aberto_em", "fechado_em", "total_vendas", "total_comissao", "observacao", "created_at", "user_id") FROM stdin;
64d80e79-5d5d-42fd-b1fc-212c4fbf2a01	2026-05-07 17:59:12.046596+00	\N	0.00	0.00	\N	2026-05-07 17:59:12.046596+00	\N
c67393b7-771a-4457-b30b-9675ef286ede	2026-05-19 22:44:14.944621+00	2026-05-26 05:21:12.257867+00	3500.00	1225.00	\N	2026-05-19 22:44:14.944621+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
731c2914-0d88-41b0-bd67-34fbeb73c00f	2026-05-26 05:21:12.257867+00	\N	0.00	0.00	\N	2026-05-26 05:21:12.257867+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
cc034ec3-5311-4264-837b-387ef52bcd15	2026-05-27 05:12:48.000096+00	\N	0.00	0.00	\N	2026-05-27 05:12:48.000096+00	38d0812a-a835-41da-8e50-a5e42d5bee73
f779398d-c9cb-45d4-a6da-a96663ff6ad9	2026-06-01 21:25:04.119126+00	\N	0.00	0.00	\N	2026-06-01 21:25:04.119126+00	17eca69f-0320-4d26-8fe7-6047107b9201
3a559b20-4016-481f-886e-138d05ee05ff	2026-06-02 23:06:01.581+00	\N	0.00	0.00	\N	2026-06-02 23:04:45.009141+00	84f5e844-5448-4c95-b9f1-b9691ad4439c
4e48a5b5-b43e-485c-b691-f6e58d2aba7c	2026-06-03 02:39:51.882713+00	\N	0.00	0.00	\N	2026-06-03 02:39:51.882713+00	7151e6b4-838a-43f8-9442-b3b5bc476305
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."clientes" ("id", "nome", "whatsapp", "created_at", "updated_at", "user_id") FROM stdin;
fe3ffe32-51a4-4b86-8210-cc371f1ad8a2	Jaqueline Lemes Rosa Gomes	35984188165	2026-05-16 19:35:25.825883+00	2026-05-16 20:45:24.13007+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
8a3fb5e4-5e91-4615-9fdc-568193629cb3	TEstedasd	32131231231	2026-05-19 22:39:45.014234+00	2026-05-19 22:39:45.014234+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
b1a56208-424f-4233-b912-6e4e0aff05ad	rqwereqrqwe	35321321312	2026-05-19 22:42:29.113059+00	2026-05-19 22:42:29.113059+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
e5fcfa66-9c8e-43d6-8b91-8268051d770e	Felipe Grillo Lopes	15997686890	2026-05-22 14:19:12.360384+00	2026-05-22 14:19:12.360384+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
2a650d86-f30d-4c16-a7a6-855cba45c263	Marco	35999148740	2026-05-22 14:50:59.719877+00	2026-05-22 14:50:59.719877+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
d976a141-7a9e-46b1-8729-c7c4b3d7068c	Davi Rosa Gomes	42342342342	2026-05-19 22:34:34.036063+00	2026-05-23 14:15:01.796142+00	\N
ac281152-dfbf-4a59-9212-ebb78dd036d4	PALMEIRAS MAIOR DE SP	15997652045	2026-05-22 15:32:44.43786+00	2026-05-23 14:15:25.160402+00	\N
edd6fe12-d0eb-4040-a34a-bc6b7cb7f7c7	Erica Coelho	15997690365	2026-05-22 17:10:03.433938+00	2026-05-23 14:15:25.160402+00	\N
7b6dfe56-f372-43b4-844f-73febc40464b	Fe	15981025579	2026-05-27 15:56:11.605078+00	2026-05-27 15:56:11.605078+00	38d0812a-a835-41da-8e50-a5e42d5bee73
749539db-d230-4c55-8ec5-c07fbbfc2978	Davi Rosa Gomes	35998912412	2026-05-27 22:41:24.793037+00	2026-05-27 23:06:09.902539+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
274c7960-f4aa-46e2-919d-7dc716e80914	Stephany	35984616655	2026-05-29 16:13:41.727358+00	2026-05-29 16:13:41.727358+00	38d0812a-a835-41da-8e50-a5e42d5bee73
8abb1f81-42e1-4451-b786-cb3c3df69031	Cíntia	35988370293	2026-05-29 23:06:17.48946+00	2026-05-29 23:06:17.48946+00	38d0812a-a835-41da-8e50-a5e42d5bee73
2a7e1af7-63f6-49fa-9d7b-fa2bddd4c671	Mãe	15998673440	2026-05-30 16:21:54.290935+00	2026-05-30 16:21:54.290935+00	38d0812a-a835-41da-8e50-a5e42d5bee73
09f72b46-94c8-4ce7-99a3-8ddc87d2b7cc	Jacqueline	35998643440	2026-05-30 16:24:27.366561+00	2026-05-30 16:24:27.366561+00	38d0812a-a835-41da-8e50-a5e42d5bee73
482ef3a4-a598-447e-bd50-adbc68c57545	TESTE	35998912512	2026-05-30 16:51:17.090606+00	2026-05-30 16:51:17.090606+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
cf9db4c0-1f12-47c9-84de-1af9c0164f4b	TESTESS	31231234123	2026-05-30 16:52:46.479081+00	2026-05-30 16:52:46.479081+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
58cd6535-f739-4454-8366-d18160881bfa	23123123123	31231231231	2026-05-30 16:56:03.36251+00	2026-05-30 16:56:03.36251+00	608bb5f2-fd68-41d3-b0bf-459d07838adb
ebcff6ac-c0f8-48e8-b957-c2b88c19462e	Monarê	15996338541	2026-05-26 03:54:08.949733+00	2026-06-02 23:03:37.127078+00	\N
a03e013e-29ed-4ab3-8253-e7b65935fb83	Alexandre	15991548631	2026-06-03 14:42:59.93879+00	2026-06-03 14:42:59.93879+00	7151e6b4-838a-43f8-9442-b3b5bc476305
373c2efe-5265-4dd2-911e-8e3d2f93a8fa	Nati	43991584514	2026-05-29 00:40:32.773291+00	2026-06-04 18:03:20.438739+00	38d0812a-a835-41da-8e50-a5e42d5bee73
\.


--
-- Data for Name: produtos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."produtos" ("id", "sku", "nome", "descricao", "ativo", "created_at", "preco_venda", "categoria_id", "material") FROM stdin;
a814e8f8-6640-4f9f-a8ad-f716c51d9165	PM3008	Pulseira Bracelete Chapa Lisa – Banhado a Ouro 18K	\N	t	2026-05-27 04:44:45.902446+00	109.90	2896ec17-6df4-4938-a511-014c9913ddaa	\N
a8763c7f-11d3-459f-a102-413aa92dfacd	PM3009	Pulseira Bracelete Chapa Lisa Ajustável – Banhado a Ouro 18K	\N	t	2026-05-27 04:45:19.509566+00	114.90	2896ec17-6df4-4938-a511-014c9913ddaa	\N
19dcc294-2005-4d21-8232-31f0ab4c2d9c	PM3006	Pulseira Elos Dourada – Banhado a Ouro 18K	\N	t	2026-05-27 04:46:08.410316+00	84.90	2896ec17-6df4-4938-a511-014c9913ddaa	\N
7bfc7da4-fa1c-43e2-a4f2-974f131f4107	PM3022	Pulseiras Zircônia Ovais Cristal Com Cartier – Banhado a Prata	\N	t	2026-05-27 04:47:05.491088+00	85.90	2896ec17-6df4-4938-a511-014c9913ddaa	\N
883d2a0d-4ae8-456d-89f9-ef4a09fc1e0c	PM3014	Pulseira Bolinhas Amassadas – Banhado a Prata	\N	t	2026-05-27 04:47:39.175036+00	64.90	2896ec17-6df4-4938-a511-014c9913ddaa	\N
61e3a2df-3b5f-4340-bbc7-c830d8f28025	BMO1073	Brinco Losango Abaulado – Banhado a Prata	\N	t	2026-06-02 22:20:14.677927+00	59.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
4a7770c8-848f-4b75-964d-4af70824a4fe	BMO1078	Brinco Ponto de luz Multicolor – Banhado a Ouro 18k	\N	t	2026-06-02 22:20:54.36569+00	59.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
d11c9d6e-85bd-4f46-a481-30f1f0e1d56a	BMO1080	Brinco Coração Cravejado Multicolor - Banhado a Ouro 18k	\N	t	2026-06-02 22:21:44.203948+00	85.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
3f4a9ab5-1711-46d0-96da-fd8911be5b2f	TESTE	VENDA  TESTE	\N	t	2026-05-27 05:29:04.231612+00	0.01	b0b52ad2-89e8-41b7-b4ea-7871a290f553	\N
b49505d6-be2a-4dbc-838b-9b6e9968efcb	PM3010	Pulseira Corrente Piastrine – Banhado a Prata	\N	t	2026-05-27 12:54:53.335504+00	56.80	2896ec17-6df4-4938-a511-014c9913ddaa	\N
45135aef-586d-436e-931f-2afbac332431	PM3000	Pulseira Corrente Piastrine – Banhado a Ouro 18K	\N	t	2026-05-27 12:56:01.975873+00	69.90	2896ec17-6df4-4938-a511-014c9913ddaa	\N
d0609882-f3aa-4a13-b39c-d9a28ec9beac	BMO1000	Brinco Pérola – Banhado a Ouro 18K	\N	t	2026-06-02 22:05:36.196558+00	39.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
137e46e7-d697-4434-909e-8b513ed1e6a4	BMO1008	Brinco Quadrado Orgânico – Banhado a Ouro 18K	\N	t	2026-06-02 22:06:20.789216+00	74.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
306eec1e-3b8c-4979-9edb-1779bfe7ad0d	BMO1011	Brinco Serpentina Cravejado – Banhado a Ouro 18K	\N	t	2026-06-02 22:07:09.60666+00	129.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
d5e9441b-9315-416a-b174-e4a051073c4b	BMO1020	Brinco Gota Ondulado – Banhado a Ouro 18K	\N	t	2026-06-02 22:08:20.492299+00	89.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
511a1988-8dd1-419a-84fb-885ca8c7b5fb	BMO1079	Brinco Coração Cravejado Multicolor - Banhado a Prata	\N	t	2026-05-27 04:26:46.059396+00	59.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
92e5f529-8647-4d13-8d4b-9c7d7d637dbf	BMO1068	Brinco Trio Coração Vazado E Zircônia – Banhado a Prata	\N	t	2026-05-27 04:27:51.658977+00	53.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
1a481517-d82d-401f-9040-d24cbcd2cb98	BMO1060	Brinco Gota – Banhado a Prata	\N	t	2026-05-27 04:29:36.463246+00	76.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
5e700646-38f6-4afb-8c6f-ab33181c9bad	BMO1065	Brinco Pérola Entrelaçado – Banhado a Prata	\N	t	2026-05-27 04:30:33.506201+00	39.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
17b99158-e8d0-40f9-9160-74e36edac464	BMO1075	Brinco Trevo Multicolor – Banhado a Prata	\N	t	2026-05-27 04:32:07.73115+00	44.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
29ab07a9-c253-4957-8daa-60c94d88d95c	BMO1071	Brinco Argola Três Fios Torcido – Banhado a Prata	\N	t	2026-05-27 04:33:17.235353+00	65.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
30f09e73-3bfc-4f57-abf5-57eea1cdcd5b	BMO1029	Brinco Coração Dobrado – Banhado a Prata	\N	t	2026-05-27 04:34:11.778425+00	44.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
47f0689d-f2b8-4741-a6ee-faa24f6d6572	BMO1028	Brinco Asa Ondulada – Banhado a Prata	\N	t	2026-05-27 04:35:18.0562+00	66.50	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
392bd700-9fb3-4f43-93e0-2906e0ee988d	BMO1072	Brinco Argola Abaulado – Banhado a Prata	\N	t	2026-05-27 04:37:15.411735+00	74.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
c6cac533-78ae-477b-9d51-c9fde0b90531	BMO1036	Brinco Trio Zircônia Cristal c/ Borda Cravejada – Banhado a Prata	\N	t	2026-05-27 04:38:35.654886+00	99.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
a8dd1d86-9d44-4d81-9db6-8357ad6f9112	BMO1012	Brinco Caule c/ 4 Folhas Cravejadas Zircônia – Banhado a Ouro 18K	\N	t	2026-05-27 04:39:31.827605+00	148.85	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
b834a8d4-9ce1-41c9-a43a-2f7de7e7fe50	BMO1019	Brinco Entrelaçado Zircônia – Banhado a Ouro 18K	\N	t	2026-05-27 04:40:29.480886+00	119.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
3de93fd0-d667-4116-b29e-7f15ec6990cf	BMO1009	Brinco Triângulo Torcido – Banhado a Ouro 18K	\N	t	2026-05-27 04:41:18.096664+00	79.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
e7c1149d-0f84-4cca-94ea-d187d85084a4	BMO1057	Brinco Piercing Coração Cravejado Multicolor - Banhado a Ouro 18K	\N	t	2026-05-27 04:42:23.747476+00	40.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
d82e460b-b428-4ae2-92e5-e9bd642035a0	BMO1059	Brinco Piercing Com Zircônia – Banhado a Prata	\N	t	2026-05-27 04:43:23.338232+00	42.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
9a4bce9b-e37e-48c7-b308-9d0bf6b1a8ac	BMO1074	Brinco Piercing Coração Cravejado Multicolor – Banhado a Prata	\N	t	2026-05-27 04:44:06.278075+00	35.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
72f27a46-9727-4c82-98b0-32499df4311f	BMO1032	Brinco Triângulo Torcido – Banhado a Prata	\N	t	2026-06-02 22:10:22.694541+00	69.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
7eb30d96-ab18-4ef6-8a84-3be4a5517252	SKU-031	Brinco Serpentina Cravejado – Banhado a Prata	\N	t	2026-06-02 22:11:01.477206+00	107.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
4579ae0e-dd5f-403d-8068-f4048d0af389	BMO1034	Brinco Serpentina Cravejado – Banhado a Prata	\N	t	2026-06-02 22:12:42.62911+00	107.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
742747ae-f9a0-452c-8d4f-8c851d351048	BMO1043	Brinco Gota Ondulado – Banhado a Prata	\N	t	2026-06-02 22:13:19.965916+00	84.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
56ea1772-a399-4cd0-a8e8-b3d665a8399c	CMO2001	Colar Corrente Bolinhas Prensadas – Banhado a Ouro 18K	\N	t	2026-06-02 22:24:49.507853+00	109.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
7154c268-ed3c-451e-af45-27ae88e725a6	SKU-037	Brinco Ear Cuff Joana- Banhado a Ouro 18K	\N	t	2026-06-02 22:15:04.16249+00	129.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
9e788d25-89bf-4cb9-8137-3f170fc04f7d	CMO2027	Colar Cordão Baiano – Banhado a Prata	\N	t	2026-06-02 22:28:34.070524+00	114.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
527b7189-1117-483b-a405-7ed680fe4b6d	BMO1048	Brinco Ear Cuff Joana- Banhado a Ouro 18K	\N	t	2026-06-02 22:16:20.123382+00	129.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
6cac3948-a9e0-411b-b6c8-cb8ddc1f2c79	BMO1054	Brinco Argola Três Fios Torcido - Banhado a Ouro 18K	\N	t	2026-06-02 22:16:54.603871+00	94.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
bfb1faf4-f572-479b-b75a-e92dc91a2814	BMO1056	Brinco Losango Abaulado - Banhado a Ouro 18K	\N	t	2026-06-02 22:17:24.028554+00	74.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
bb8e27d6-24c9-43b9-a423-812f2b1eb3af	BMO1058	Brinco Trevo Multicolor - Banhado a Ouro 18K	\N	t	2026-06-02 22:18:14.088478+00	69.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
daa0a104-6f83-4d30-af3f-26ac4c8f5caf	BMO1061	Brinco Ear Cuff Joana – Banhado a Prata	\N	t	2026-06-02 22:18:58.165013+00	94.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
a4f90c59-73d3-4f68-a31a-978b67ffb7dd	BMO1063	Brinco Trio Ponto De Luz Quadrado Com Zircônia – Banhado a Prata	\N	t	2026-06-02 22:19:30.220674+00	65.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
432a4fee-bedd-40ac-bad3-b1edaaba14f7	CMO2002	Colar Choker Folhas Duplas Texturizadas – Banhado a Ouro 18K	\N	t	2026-06-02 22:25:12.546176+00	233.27	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
87552619-049b-4eaa-99b7-4694e88d5181	CMO2005	Colar Choker Coração – Banhado a Ouro 18K	\N	t	2026-06-02 22:25:37.833266+00	163.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
f15c5328-5e80-40c2-9154-90f851767402	CMO2009	Colar Choker Folhas Duplas Texturizadas – Banhado a Prata	\N	t	2026-06-02 22:26:13.604984+00	129.52	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
b6f81f34-d126-458c-8542-a76a27b798d4	CMO2015	Colar Árvore – Banhado a Ouro 18K	\N	t	2026-06-02 22:26:37.887648+00	99.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
ed7942f2-e427-4e55-a973-b8aaf5ee25bb	CMO2018	Colar Cordão Baiano – Banhado a Ouro 18K	\N	t	2026-06-02 22:27:05.797921+00	214.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
7f4df53a-cec6-478d-b298-201230cb2f97	CMO2020	Colar Duplo Corrente Com Pérolas E Elos Diamantados – Banhado a Ouro 18K	\N	t	2026-06-02 22:27:29.095725+00	134.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
5d92e99d-56f0-44bc-b032-8295797b61e9	CMO2028	Colar Choker Riviera Zircônia Navete – Banhado a Prata	\N	t	2026-06-02 22:28:57.756278+00	128.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
9669d1f6-b888-4f36-82db-f5480be8a531	CMO2035	Colar Veneziana c/ Pingente Redondo – Banhado a Prata	\N	t	2026-06-02 22:29:31.783488+00	82.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
5d50cf45-12e4-45fe-a0e4-949b54370f13	BMO1031	Brinco Quadrado Orgânico – Banhado a Prata	\N	t	2026-06-02 22:09:09.55684+00	74.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
32e5b77f-c91b-40f9-8fcf-792888b6f598	BMO1047	Brinco Gota - Banhado a Ouro 18K	\N	t	2026-06-02 22:13:55.431432+00	99.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
2c2a587b-a105-485f-bcb9-c578fa0c034a	CMO2036	Colar Veneziana c/ Pingente Redondo – Banhado a Ouro 18k	\N	t	2026-06-02 22:30:00.499071+00	114.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
99924ac9-dd4c-4940-9cf7-cdf5b0405a43	PM3002	Pulseira Riviera Zircônias Multicolor – Banhado a Ouro 18K	\N	t	2026-06-02 22:34:24.977771+00	114.90	2896ec17-6df4-4938-a511-014c9913ddaa	\N
aec380dc-333c-40bf-8f13-845c03e322e2	PM3007	Pulseira Bracelete Riviera Cravejada – Banhado a Ouro 18K	\N	t	2026-06-02 22:35:12.723244+00	142.49	2896ec17-6df4-4938-a511-014c9913ddaa	\N
95ffd1dc-3c39-40f1-891d-6d52d22054a6	PM3019	Pulseira Bracelete Chapa Lisa Ajustável – Banhado a Prata	\N	t	2026-06-02 22:35:56.940906+00	89.90	2896ec17-6df4-4938-a511-014c9913ddaa	\N
c8c79372-c8ed-4676-8201-fed7e03495e9	TM5003	Tornozeleira Ponto De Luz Coração – Banhado a Ouro 18K	\N	t	2026-06-02 22:37:17.086702+00	59.90	a09a5d33-b3ad-4b67-9dea-93bddf9f092d	\N
abf5d44f-502a-4766-9c43-0af964282a37	TM5004	Tornozeleira Ponto De Luz Redondo – Banhado a Prata	\N	t	2026-06-02 22:37:43.267926+00	49.90	a09a5d33-b3ad-4b67-9dea-93bddf9f092d	\N
c50178f3-e283-4cad-84de-b6e1d3658d4f	AMO6001	Anel Torcido – Banhado a Ouro 18K	\N	t	2026-06-03 02:57:01.921645+00	98.90	f8d18174-a958-4868-84ce-f8e0f9583b99	\N
58b249ce-c3a5-4d3f-bc26-10d173c9dd30	AMO6002	Anel Trabalhado Coração – Banhado a Ouro 18K	\N	t	2026-06-03 02:57:30.526973+00	98.90	f8d18174-a958-4868-84ce-f8e0f9583b99	\N
0246cbcb-f127-4df5-a4d0-dae7e1474e65	BMO1003	Brinco Argola Torcida – Banhado a Ouro 18K	\N	t	2026-06-03 02:59:13.147229+00	64.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
f9b0d7ec-293d-46ce-aa03-96753e296278	BMO1004	Brinco Argolinha Click  Cravejada Cristal – Banhado a Ouro 18K	\N	t	2026-06-03 02:59:39.954643+00	89.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
92ddea08-1b9f-4472-ba8d-e46190a3e09f	BMO1005	Brinco Asa Ondulada – Banhado a Ouro 18K	\N	t	2026-06-03 03:00:09.996932+00	89.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
6b395253-131d-4ba5-9865-cb645cd526ef	BMO1042	Brinco Entrelaçado Zircônia – Banhado a Prata	\N	t	2026-06-03 03:01:10.425379+00	64.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
a2e9be8e-072f-4dfd-b637-b73ef5ee5979	BMO1051	Brinco Argola Quadrada Cravejada - Banhado a Ouro 18K	\N	t	2026-06-03 03:02:10.131013+00	85.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
0f20a33e-b844-4d8c-af17-98e07f7428ee	BMO1055	Brinco Argola Abaulado - Banhado a Ouro 18K	\N	t	2026-06-03 03:02:41.758205+00	112.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
ce22a517-0704-49e5-952e-312809a56ea3	CMO2014	Colar Veneziana E Cruz – Banhado a Ouro 18K	\N	t	2026-06-03 03:03:53.330154+00	114.90	e88de192-da1e-43b4-88b9-0b5b077ab109	\N
499be73d-8ce9-4c35-99e1-b837dff2b972	BMO1002	Brinco Flor Vazada Cravejada – Banhado a Ouro 18K	\N	t	2026-06-03 02:58:46.348676+00	99.90	0654f8a2-7991-400e-b373-ef8205a8d92d	\N
0d45434a-abe6-4964-8d14-8a0161d2e8a6	TMO5001	Tornozeleira Pérola - Banhada a Prata	\N	t	2026-06-08 23:17:59.92471+00	59.90	\N	\N
\.


--
-- Data for Name: estoque; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."estoque" ("id", "produto_id", "quantidade", "created_at", "updated_at", "quantidade_vendida", "user_id") FROM stdin;
288cbab1-477a-4bdf-b728-08ff84ad68ad	3de93fd0-d667-4116-b29e-7f15ec6990cf	0	2026-05-27 05:18:06.858022+00	2026-05-29 16:13:41.130296+00	1	38d0812a-a835-41da-8e50-a5e42d5bee73
0dc18aa3-06a1-45cc-a7eb-788fa4a1662f	45135aef-586d-436e-931f-2afbac332431	0	2026-05-27 12:56:54.288776+00	2026-05-29 23:06:17.19581+00	1	38d0812a-a835-41da-8e50-a5e42d5bee73
6612ef8d-0f77-4580-8b3d-0090b2d1f67d	92e5f529-8647-4d13-8d4b-9c7d7d637dbf	1	2026-05-27 05:17:54.232182+00	2026-05-27 05:17:54.232182+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
a0528d22-2f78-4dfc-b3b9-3f74a0e5a9a4	a8dd1d86-9d44-4d81-9db6-8357ad6f9112	1	2026-05-27 05:18:09.647437+00	2026-05-27 05:18:09.647437+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
d741c77f-fae7-4b2e-9e6c-33c6557d6007	b834a8d4-9ce1-41c9-a43a-2f7de7e7fe50	1	2026-05-27 05:18:13.307274+00	2026-05-27 05:18:13.307274+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
611b3fe8-2b5f-4031-ac4a-911be991047c	47f0689d-f2b8-4741-a6ee-faa24f6d6572	1	2026-05-27 05:18:16.385592+00	2026-05-27 05:18:16.385592+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
ae952dd3-8558-41f9-92dd-49ab3521ba1d	30f09e73-3bfc-4f57-abf5-57eea1cdcd5b	1	2026-05-27 05:18:25.510468+00	2026-05-27 05:18:25.510468+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
32811f8e-8e97-4cf4-b83f-b96283f9fefa	c6cac533-78ae-477b-9d51-c9fde0b90531	1	2026-05-27 05:18:33.570799+00	2026-05-27 05:18:33.570799+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
2f59a7ed-e721-4835-b8b3-1b31de424b38	9a4bce9b-e37e-48c7-b308-9d0bf6b1a8ac	1	2026-05-27 05:19:21.551248+00	2026-05-27 05:19:21.551248+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
d6033302-f5b6-4180-8d7d-3acb6dfdbf04	e7c1149d-0f84-4cca-94ea-d187d85084a4	1	2026-05-27 05:19:32.390207+00	2026-05-27 05:19:32.390207+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
df8824f2-72aa-4eef-b6ad-eafcc378e6de	d82e460b-b428-4ae2-92e5-e9bd642035a0	1	2026-05-27 05:19:39.290247+00	2026-05-27 05:19:39.290247+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
9c1d7986-8edc-4264-946c-d3cf3de1b31c	29ab07a9-c253-4957-8daa-60c94d88d95c	1	2026-05-27 05:21:01.808727+00	2026-05-27 05:21:01.808727+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
b4bdffdc-16fc-49a6-a9c1-49bfa819362c	17b99158-e8d0-40f9-9160-74e36edac464	1	2026-05-27 05:21:08.758318+00	2026-05-27 05:21:08.758318+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
41df7b23-3a19-455b-90e8-be5ac2285762	5e700646-38f6-4afb-8c6f-ab33181c9bad	1	2026-05-27 05:21:16.105914+00	2026-05-27 05:21:16.105914+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
fa74ae07-be80-416f-8ecb-2787d70c2acb	1a481517-d82d-401f-9040-d24cbcd2cb98	1	2026-05-27 05:23:03.808664+00	2026-05-27 05:23:03.808664+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
d709f7e7-5a25-4194-9460-e292e51e558d	a8763c7f-11d3-459f-a102-413aa92dfacd	1	2026-05-27 05:23:56.836102+00	2026-05-27 05:23:56.836102+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
cd0d2446-04ee-4e7b-935a-128968628c0a	a814e8f8-6640-4f9f-a8ad-f716c51d9165	1	2026-05-27 05:25:38.757644+00	2026-05-27 05:25:38.757644+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
bfd9506f-b6fe-4c45-bbaf-edb8b0d7e45f	19dcc294-2005-4d21-8232-31f0ab4c2d9c	0	2026-05-27 05:24:41.429461+00	2026-05-30 16:21:53.981627+00	1	38d0812a-a835-41da-8e50-a5e42d5bee73
df603895-e28b-4d3f-83a0-a3d602ead357	511a1988-8dd1-419a-84fb-885ca8c7b5fb	0	2026-05-27 05:17:47.208389+00	2026-05-30 16:24:27.157058+00	1	38d0812a-a835-41da-8e50-a5e42d5bee73
9119c0dc-3720-4fb9-8c10-5354a7b901a6	392bd700-9fb3-4f43-93e0-2906e0ee988d	0	2026-05-27 05:20:45.331585+00	2026-06-04 18:03:20.119545+00	1	38d0812a-a835-41da-8e50-a5e42d5bee73
8aa0cf43-5f4f-4893-a4dc-d4f182108016	883d2a0d-4ae8-456d-89f9-ef4a09fc1e0c	1	2026-05-27 05:26:04.142122+00	2026-05-27 05:26:04.142122+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
591ea2be-5f2e-4ce2-8228-7196efc57323	4a7770c8-848f-4b75-964d-4af70824a4fe	3	2026-06-02 22:46:13.195675+00	2026-06-02 23:17:03.836891+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
8dab7fb0-416a-441e-8a34-93218a864c40	b49505d6-be2a-4dbc-838b-9b6e9968efcb	1	2026-05-27 12:56:47.485458+00	2026-05-27 12:56:47.485458+00	0	38d0812a-a835-41da-8e50-a5e42d5bee73
28423ef4-46b3-4303-a35d-a5eb54638846	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	1	2026-05-27 22:40:31.376546+00	2026-05-27 22:40:31.376546+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
32c92ca0-55c0-4465-be9b-9cf4f658331d	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	0	2026-05-27 22:40:45.272458+00	2026-05-30 16:56:03.161413+00	10	608bb5f2-fd68-41d3-b0bf-459d07838adb
b199e57d-44ef-4d9d-9211-5b35094dbb35	d0609882-f3aa-4a13-b39c-d9a28ec9beac	1	2026-06-02 22:42:22.087083+00	2026-06-02 22:42:22.087083+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
8b04420d-9229-4d0d-8ad3-f0584558c824	137e46e7-d697-4434-909e-8b513ed1e6a4	1	2026-06-02 22:42:33.493495+00	2026-06-02 22:42:33.493495+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
736b6bcb-6e22-4954-8b86-fc4b294e815c	3de93fd0-d667-4116-b29e-7f15ec6990cf	1	2026-06-02 22:42:43.412475+00	2026-06-02 22:42:43.412475+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
625bbf4d-b077-4348-bd85-93df87d39ec8	306eec1e-3b8c-4979-9edb-1779bfe7ad0d	1	2026-06-02 22:42:53.211594+00	2026-06-02 22:42:53.211594+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
7fca66f0-0214-4925-9b66-8fa9065c8499	d5e9441b-9315-416a-b174-e4a051073c4b	1	2026-06-02 22:43:04.571388+00	2026-06-02 22:43:04.571388+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
012df210-b2ca-45da-9a99-105d81c00488	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	97	2026-05-27 05:30:01.778177+00	2026-06-03 17:37:15.253191+00	3	38d0812a-a835-41da-8e50-a5e42d5bee73
11b4af7f-1628-45fa-902b-168cddca6bec	7bfc7da4-fa1c-43e2-a4f2-974f131f4107	0	2026-05-27 05:25:52.001467+00	2026-05-29 00:40:32.440041+00	1	38d0812a-a835-41da-8e50-a5e42d5bee73
4508bed7-8215-4ad5-a6f4-051900f8a219	5d50cf45-12e4-45fe-a0e4-949b54370f13	1	2026-06-02 22:43:20.662075+00	2026-06-02 22:43:20.662075+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
722bf8dc-28a3-4a07-a561-360d8394f87b	72f27a46-9727-4c82-98b0-32499df4311f	1	2026-06-02 22:43:32.654345+00	2026-06-02 22:43:32.654345+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
1456fb11-cf24-4944-afa4-345d43a8fe7e	4579ae0e-dd5f-403d-8068-f4048d0af389	1	2026-06-02 22:43:42.728879+00	2026-06-02 22:43:42.728879+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
8bb1e81a-82a1-4a32-b6da-ad27cf63fb56	742747ae-f9a0-452c-8d4f-8c851d351048	1	2026-06-02 22:43:52.732024+00	2026-06-02 22:43:52.732024+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
b3dece1b-e237-4c10-bf5f-ce7fb41e2184	32e5b77f-c91b-40f9-8fcf-792888b6f598	1	2026-06-02 22:44:04.701878+00	2026-06-02 22:44:04.701878+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
08c4617f-20d5-46d7-b63c-c7372099372d	527b7189-1117-483b-a405-7ed680fe4b6d	1	2026-06-02 22:44:15.24388+00	2026-06-02 22:44:15.24388+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
2c2d9b7b-67a7-4986-a94e-8ddcb4c3bfea	6cac3948-a9e0-411b-b6c8-cb8ddc1f2c79	1	2026-06-02 22:44:23.70066+00	2026-06-02 22:44:23.70066+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
621f7da1-8692-441b-9f09-e9a4601f23c0	bfb1faf4-f572-479b-b75a-e92dc91a2814	1	2026-06-02 22:44:34.542892+00	2026-06-02 22:44:34.542892+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
772e11c3-7753-42f3-bc0d-66746ab83e2d	bb8e27d6-24c9-43b9-a423-812f2b1eb3af	1	2026-06-02 22:44:44.517938+00	2026-06-02 22:44:44.517938+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
f6360718-e183-458f-bfa2-d6f56c292852	1a481517-d82d-401f-9040-d24cbcd2cb98	1	2026-06-02 22:44:54.006512+00	2026-06-02 22:44:54.006512+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
e02063c4-ac8c-486c-8487-ddda86721377	daa0a104-6f83-4d30-af3f-26ac4c8f5caf	1	2026-06-02 22:45:03.789253+00	2026-06-02 22:45:03.789253+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
83c37ad6-98a3-4a57-9045-0c0682359d55	a4f90c59-73d3-4f68-a31a-978b67ffb7dd	1	2026-06-02 22:45:22.317247+00	2026-06-02 22:45:22.317247+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
6e58e545-d85b-4af4-b83e-3fb4fabeea31	5e700646-38f6-4afb-8c6f-ab33181c9bad	1	2026-06-02 22:45:38.141279+00	2026-06-02 22:45:38.141279+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
89a5a115-5d46-45a7-b4a8-88eb91862a22	29ab07a9-c253-4957-8daa-60c94d88d95c	1	2026-06-02 22:45:47.992702+00	2026-06-02 22:45:47.992702+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
411e0119-74c7-4be0-8931-645eba6acc6b	61e3a2df-3b5f-4340-bbc7-c830d8f28025	1	2026-06-02 22:45:58.552917+00	2026-06-02 22:45:58.552917+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
2d2e2af2-afdb-4c2b-8ddf-ee5f9d10553a	17b99158-e8d0-40f9-9160-74e36edac464	1	2026-06-02 22:46:07.528375+00	2026-06-02 22:46:07.528375+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
495cd370-627a-4830-a083-0bfdc241bf6a	511a1988-8dd1-419a-84fb-885ca8c7b5fb	1	2026-06-02 22:46:23.21167+00	2026-06-02 22:46:23.21167+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
eaf33b2e-98cf-40df-ba26-5f3f756cd7d8	d11c9d6e-85bd-4f46-a481-30f1f0e1d56a	1	2026-06-02 22:46:38.08022+00	2026-06-02 22:46:38.08022+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
63dc22f6-5144-4792-8eca-1ab5ceaba2f8	56ea1772-a399-4cd0-a8e8-b3d665a8399c	1	2026-06-02 22:46:49.615328+00	2026-06-02 22:46:49.615328+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
deba4f79-b952-42be-a0cb-41126bba4833	432a4fee-bedd-40ac-bad3-b1edaaba14f7	1	2026-06-02 22:46:59.578492+00	2026-06-02 22:46:59.578492+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
ec0de316-89ab-406e-9076-cf9779421dc4	87552619-049b-4eaa-99b7-4694e88d5181	1	2026-06-02 22:47:18.508579+00	2026-06-02 22:47:29.714899+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
bb77ad10-d925-43aa-99a9-548065cbef9c	f15c5328-5e80-40c2-9154-90f851767402	1	2026-06-02 22:47:41.839507+00	2026-06-02 22:47:41.839507+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
f8f3f171-15cc-4ae2-aa30-dcb05f469a44	b6f81f34-d126-458c-8542-a76a27b798d4	1	2026-06-02 22:47:50.335314+00	2026-06-02 22:47:50.335314+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
7abdd80d-026b-4f81-9b6a-283b59ab0246	ed7942f2-e427-4e55-a973-b8aaf5ee25bb	1	2026-06-02 22:48:00.540332+00	2026-06-02 22:48:00.540332+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
fbd9dabc-e708-4e69-972d-cada8e9098de	7f4df53a-cec6-478d-b298-201230cb2f97	1	2026-06-02 22:48:13.621978+00	2026-06-02 22:48:13.621978+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
07a540ae-0181-49c1-9d35-cbb5eb4fbbf9	9e788d25-89bf-4cb9-8137-3f170fc04f7d	1	2026-06-02 22:48:27.246837+00	2026-06-02 22:48:27.246837+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
df9c7718-5b0b-4429-82f9-8e819c82c59d	5d92e99d-56f0-44bc-b032-8295797b61e9	1	2026-06-02 22:48:43.449617+00	2026-06-02 22:48:43.449617+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
8e49f5e3-81eb-4f15-be94-f23195bca13f	9669d1f6-b888-4f36-82db-f5480be8a531	1	2026-06-02 22:48:52.837646+00	2026-06-02 22:48:52.837646+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
bca3ce44-1ab4-41aa-a361-773e4ef72257	2c2a587b-a105-485f-bcb9-c578fa0c034a	1	2026-06-02 22:49:03.961905+00	2026-06-02 22:49:03.961905+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
6cbfc421-35c3-4e99-abdb-49f7a9b5fc2b	99924ac9-dd4c-4940-9cf7-cdf5b0405a43	1	2026-06-02 22:49:24.046235+00	2026-06-02 22:49:24.046235+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
cc81d637-6094-4be3-9a3b-58d3a6bee6a9	aec380dc-333c-40bf-8f13-845c03e322e2	1	2026-06-02 22:49:31.877567+00	2026-06-02 22:49:31.877567+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
b2b370de-7d06-47b9-8b38-5900b6d29baa	a8763c7f-11d3-459f-a102-413aa92dfacd	1	2026-06-02 22:49:43.893046+00	2026-06-02 22:49:43.893046+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
a1f213c3-43f5-437b-9403-61758957e5aa	95ffd1dc-3c39-40f1-891d-6d52d22054a6	1	2026-06-02 22:49:54.874605+00	2026-06-02 22:49:54.874605+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
062c70cb-b9ba-4cc4-b294-040beca9074f	7bfc7da4-fa1c-43e2-a4f2-974f131f4107	1	2026-06-02 22:50:03.508695+00	2026-06-02 22:50:03.508695+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
75dd5a86-63f1-436d-b314-2ad460dea2e4	c8c79372-c8ed-4676-8201-fed7e03495e9	1	2026-06-02 22:50:15.320264+00	2026-06-02 22:50:15.320264+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
8a24227c-8b50-462a-86a4-9ff6e54e0b88	abf5d44f-502a-4766-9c43-0af964282a37	1	2026-06-02 22:50:25.166038+00	2026-06-02 22:50:25.166038+00	0	17eca69f-0320-4d26-8fe7-6047107b9201
b2ecf613-0f25-4866-ad1e-dbd2e77d53c7	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	10	2026-06-02 23:05:04.021834+00	2026-06-02 23:05:04.021834+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
5f40137f-496b-45ab-852f-c66fd1cfb869	c50178f3-e283-4cad-84de-b6e1d3658d4f	1	2026-06-03 03:05:32.55659+00	2026-06-03 03:05:32.55659+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
a4454348-ee3b-479d-8703-db9acb57943c	58b249ce-c3a5-4d3f-bc26-10d173c9dd30	1	2026-06-03 03:05:41.933253+00	2026-06-03 03:05:41.933253+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
98595c8f-c4e6-485c-96fd-267583da7273	499be73d-8ce9-4c35-99e1-b837dff2b972	1	2026-06-03 03:05:49.695847+00	2026-06-03 03:05:49.695847+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
4b68c2a4-23de-4d2d-a1d3-c1b48c1a6a6f	f9b0d7ec-293d-46ce-aa03-96753e296278	1	2026-06-03 03:05:59.230929+00	2026-06-03 03:05:59.230929+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
68112769-a120-4136-88bb-4849abd7cd5e	92ddea08-1b9f-4472-ba8d-e46190a3e09f	1	2026-06-03 03:06:07.205041+00	2026-06-03 03:06:07.205041+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
3a455c68-4930-40d6-ad36-6ccc5034e5a2	306eec1e-3b8c-4979-9edb-1779bfe7ad0d	2	2026-06-03 03:06:15.105209+00	2026-06-03 03:06:24.027933+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
8d6b9398-2119-49d6-9b28-a82a873e0dd2	a8dd1d86-9d44-4d81-9db6-8357ad6f9112	1	2026-06-03 03:06:30.883572+00	2026-06-03 03:06:30.883572+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
2ac6eb4a-9a75-4e34-b191-0203a1b591b0	b834a8d4-9ce1-41c9-a43a-2f7de7e7fe50	1	2026-06-03 03:06:41.871794+00	2026-06-03 03:06:41.871794+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
647992d9-0b39-4a8e-bd5b-01d933de34ef	c6cac533-78ae-477b-9d51-c9fde0b90531	1	2026-06-03 03:06:49.79956+00	2026-06-03 03:06:49.79956+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
59d06bce-c361-4618-b320-9161fd57f2b1	6b395253-131d-4ba5-9865-cb645cd526ef	1	2026-06-03 03:07:03.833548+00	2026-06-03 03:07:03.833548+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
9f1d437e-1d83-45cb-8ca3-7a43e985097c	a2e9be8e-072f-4dfd-b637-b73ef5ee5979	1	2026-06-03 03:07:12.372398+00	2026-06-03 03:07:12.372398+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
95c8b6db-110f-4852-844c-dd9f204faf76	0f20a33e-b844-4d8c-af17-98e07f7428ee	1	2026-06-03 03:07:20.249101+00	2026-06-03 03:07:20.249101+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
008e1095-868f-46b2-85ec-fe1d622d1242	5e700646-38f6-4afb-8c6f-ab33181c9bad	1	2026-06-03 03:07:30.65237+00	2026-06-03 03:07:30.65237+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
52f3f59a-232d-4560-800b-407a26434f57	4a7770c8-848f-4b75-964d-4af70824a4fe	2	2026-06-03 03:07:43.305447+00	2026-06-03 03:07:43.305447+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
1ff14f98-6f4b-429e-8bab-9e517926060e	511a1988-8dd1-419a-84fb-885ca8c7b5fb	1	2026-06-03 03:07:53.1908+00	2026-06-03 03:07:53.1908+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
a882e0b0-df23-4937-9f07-c183e40b1185	432a4fee-bedd-40ac-bad3-b1edaaba14f7	1	2026-06-03 03:08:01.425935+00	2026-06-03 03:08:01.425935+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
66ae9f69-d2fd-48e5-9d0d-62cac73808e7	ce22a517-0704-49e5-952e-312809a56ea3	1	2026-06-03 03:08:13.726847+00	2026-06-03 03:08:13.726847+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
196d9337-de3d-4e9f-a4de-02109ef5e05d	99924ac9-dd4c-4940-9cf7-cdf5b0405a43	1	2026-06-03 03:08:23.655442+00	2026-06-03 03:08:23.655442+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
3b032e0d-3f7e-4c06-925e-5aa65a84f65b	a814e8f8-6640-4f9f-a8ad-f716c51d9165	1	2026-06-03 03:08:32.326109+00	2026-06-03 03:08:32.326109+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
70bf32d6-0550-4514-b3bf-ca86132854bb	a8763c7f-11d3-459f-a102-413aa92dfacd	1	2026-06-03 03:08:40.247586+00	2026-06-03 03:08:40.247586+00	0	7151e6b4-838a-43f8-9442-b3b5bc476305
82ff8f20-2531-4300-a350-3f2ccf11853b	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	4	2026-06-02 22:57:16.161972+00	2026-06-03 13:28:16.332996+00	1	17eca69f-0320-4d26-8fe7-6047107b9201
fbd67e38-9b64-4e4d-85be-d192e88a38d2	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	3	2026-06-03 03:32:22.774742+00	2026-06-03 14:42:59.219686+00	2	7151e6b4-838a-43f8-9442-b3b5bc476305
a3e7c9aa-ac8e-44ab-96e3-d1531f471bb0	6cac3948-a9e0-411b-b6c8-cb8ddc1f2c79	1	2026-06-08 22:55:39.025842+00	2026-06-08 22:55:39.025842+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
d572ec2c-f976-4b9c-900c-e3d9fbf2fa2b	29ab07a9-c253-4957-8daa-60c94d88d95c	1	2026-06-08 22:55:39.573971+00	2026-06-08 22:55:39.573971+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
0dd29f77-bd47-4a9d-b084-ea74f59f3ae7	d11c9d6e-85bd-4f46-a481-30f1f0e1d56a	1	2026-06-08 22:55:40.07429+00	2026-06-08 22:55:40.07429+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
a983a665-76a3-4491-967e-164a24b53dad	511a1988-8dd1-419a-84fb-885ca8c7b5fb	1	2026-06-08 22:55:40.276804+00	2026-06-08 22:55:40.276804+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
822218f8-675f-4052-9e98-433af15fcaa7	daa0a104-6f83-4d30-af3f-26ac4c8f5caf	1	2026-06-08 22:55:40.475323+00	2026-06-08 22:55:40.475323+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
c35b06ea-c043-4829-90b0-ac93f9c38d17	527b7189-1117-483b-a405-7ed680fe4b6d	1	2026-06-08 22:55:40.68427+00	2026-06-08 22:55:40.68427+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
7cffd9db-c322-4f32-8f94-3a55fee4e9d3	32e5b77f-c91b-40f9-8fcf-792888b6f598	1	2026-06-08 22:55:40.886182+00	2026-06-08 22:55:40.886182+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
8871c00e-c43a-4d49-8c74-f017fd15a635	d5e9441b-9315-416a-b174-e4a051073c4b	1	2026-06-08 22:55:41.073898+00	2026-06-08 22:55:41.073898+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
12d6b8ee-bf27-432e-a3c4-e52d22ecbdf4	742747ae-f9a0-452c-8d4f-8c851d351048	1	2026-06-08 22:55:41.260882+00	2026-06-08 22:55:41.260882+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
1fc0426e-dbf5-4eaf-bb26-fbfc47049b05	1a481517-d82d-401f-9040-d24cbcd2cb98	1	2026-06-08 22:55:41.446981+00	2026-06-08 22:55:41.446981+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
2bc3a5fe-eb65-4cc2-a078-0d8709f89eb4	bfb1faf4-f572-479b-b75a-e92dc91a2814	1	2026-06-08 22:55:41.634399+00	2026-06-08 22:55:41.634399+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
3348fba3-b3c4-4590-be65-be7f88f463ae	61e3a2df-3b5f-4340-bbc7-c830d8f28025	1	2026-06-08 22:55:41.82524+00	2026-06-08 22:55:41.82524+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
03d170d0-4259-4d9b-aabe-833c2d1570d9	5e700646-38f6-4afb-8c6f-ab33181c9bad	1	2026-06-08 22:55:42.01399+00	2026-06-08 22:55:42.01399+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
53da8e12-2d5e-4e2a-ae7a-a6a65b8323b8	d0609882-f3aa-4a13-b39c-d9a28ec9beac	1	2026-06-08 22:55:42.203849+00	2026-06-08 22:55:42.203849+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
c71ed7c8-358c-4287-8b45-8acbc51c63e1	4a7770c8-848f-4b75-964d-4af70824a4fe	3	2026-06-08 22:55:42.399804+00	2026-06-08 22:55:42.399804+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
c8dacee0-420f-45d7-a4a5-c805ef8266cc	137e46e7-d697-4434-909e-8b513ed1e6a4	1	2026-06-08 22:55:42.598952+00	2026-06-08 22:55:42.598952+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
97ded692-8bc8-4a81-9337-57de013fab8b	5d50cf45-12e4-45fe-a0e4-949b54370f13	1	2026-06-08 22:55:42.795287+00	2026-06-08 22:55:42.795287+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
081dbdf8-99ad-497e-a1b2-ce6ef59f0d18	306eec1e-3b8c-4979-9edb-1779bfe7ad0d	1	2026-06-08 22:55:42.982483+00	2026-06-08 22:55:42.982483+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
f6ca4668-fb02-42a2-812f-a647aed30be1	4579ae0e-dd5f-403d-8068-f4048d0af389	1	2026-06-08 22:55:43.173819+00	2026-06-08 22:55:43.173819+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
d68277d7-5a99-4dd3-b2b8-fb226aea6093	bb8e27d6-24c9-43b9-a423-812f2b1eb3af	1	2026-06-08 22:55:43.361132+00	2026-06-08 22:55:43.361132+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
52627d14-1adf-4226-af52-7b021c6fd5fb	17b99158-e8d0-40f9-9160-74e36edac464	1	2026-06-08 22:55:43.548329+00	2026-06-08 22:55:43.548329+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
ea7f214d-3d1e-426a-a8c1-21e8e36b1e9e	3de93fd0-d667-4116-b29e-7f15ec6990cf	1	2026-06-08 22:55:43.73512+00	2026-06-08 22:55:43.73512+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
5f4cc7a3-49ff-4e44-b4b8-234a1cb540ef	72f27a46-9727-4c82-98b0-32499df4311f	1	2026-06-08 22:55:43.921632+00	2026-06-08 22:55:43.921632+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
096b0a58-5e53-4bb1-8c56-d995478f3d17	a4f90c59-73d3-4f68-a31a-978b67ffb7dd	1	2026-06-08 22:55:44.105811+00	2026-06-08 22:55:44.105811+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
1651afbb-2400-49bc-ad17-8e3d27bdfb78	b6f81f34-d126-458c-8542-a76a27b798d4	1	2026-06-08 22:55:44.29145+00	2026-06-08 22:55:44.29145+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
2e691eb5-28e8-452f-b736-121bb0c6e277	87552619-049b-4eaa-99b7-4694e88d5181	1	2026-06-08 22:55:44.477078+00	2026-06-08 22:55:44.477078+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
b0413431-e0aa-44b0-a88f-de9a9eb2fda0	432a4fee-bedd-40ac-bad3-b1edaaba14f7	1	2026-06-08 22:55:44.665518+00	2026-06-08 22:55:44.665518+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
16a0063a-1f75-48f3-9270-ee13ae07e58b	f15c5328-5e80-40c2-9154-90f851767402	1	2026-06-08 22:55:44.846347+00	2026-06-08 22:55:44.846347+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
a25f22e6-c8cc-4e74-89c4-70ff18fc7a74	5d92e99d-56f0-44bc-b032-8295797b61e9	1	2026-06-08 22:55:45.062798+00	2026-06-08 22:55:45.062798+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
aee6ce4e-f1f5-4358-bf49-4123079d85fe	ed7942f2-e427-4e55-a973-b8aaf5ee25bb	1	2026-06-08 22:55:45.248614+00	2026-06-08 22:55:45.248614+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
860c096c-5eb2-4b91-906b-4fd5800050cb	9e788d25-89bf-4cb9-8137-3f170fc04f7d	1	2026-06-08 22:55:45.445108+00	2026-06-08 22:55:45.445108+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
123226f2-f81a-4bdd-a04f-ed2ede7529fa	56ea1772-a399-4cd0-a8e8-b3d665a8399c	1	2026-06-08 22:55:45.636687+00	2026-06-08 22:55:45.636687+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
1c65905f-f8b8-46d1-a4e6-f5e1d262c7b8	7f4df53a-cec6-478d-b298-201230cb2f97	1	2026-06-08 22:55:45.822374+00	2026-06-08 22:55:45.822374+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
e23ecb2c-8e39-4047-b7ca-627ed18c6c37	2c2a587b-a105-485f-bcb9-c578fa0c034a	1	2026-06-08 22:55:46.025964+00	2026-06-08 22:55:46.025964+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
dc1d087a-302d-4b6e-9061-34a193667c6f	a8763c7f-11d3-459f-a102-413aa92dfacd	1	2026-06-08 22:55:46.41383+00	2026-06-08 22:55:46.41383+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
a8484968-f6a1-4e2d-abfe-fa85f0784e28	aec380dc-333c-40bf-8f13-845c03e322e2	1	2026-06-08 22:55:46.813807+00	2026-06-08 22:55:46.813807+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
7f660c30-9b1b-4682-b60b-799eb1d3e334	7bfc7da4-fa1c-43e2-a4f2-974f131f4107	1	2026-06-08 22:55:47.195816+00	2026-06-08 22:55:47.195816+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
35ed09a2-9d04-4e99-a37b-0c8a96ab4275	abf5d44f-502a-4766-9c43-0af964282a37	1	2026-06-08 22:55:47.579021+00	2026-06-08 22:55:47.579021+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
3ad85415-5b27-4fef-b4b8-34b9c4ec0671	9669d1f6-b888-4f36-82db-f5480be8a531	1	2026-06-08 22:55:46.211338+00	2026-06-08 22:55:46.211338+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
9b99125c-12a9-4af7-80cf-403d6f6d787b	95ffd1dc-3c39-40f1-891d-6d52d22054a6	1	2026-06-08 22:55:46.625202+00	2026-06-08 22:55:46.625202+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
dcf49925-c21e-423b-93ab-e997f48fd2d5	99924ac9-dd4c-4940-9cf7-cdf5b0405a43	1	2026-06-08 22:55:47.005015+00	2026-06-08 22:55:47.005015+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
8fe72938-a81c-43f9-b47d-74973098c545	c8c79372-c8ed-4676-8201-fed7e03495e9	1	2026-06-08 22:55:47.392697+00	2026-06-08 22:55:47.392697+00	0	14022913-5c62-4219-8bcc-e1fa4ecb0ae3
2ad6eeae-b6ab-4d06-8001-7dad9cd2d06b	0d45434a-abe6-4964-8d14-8a0161d2e8a6	2	2026-06-08 23:18:06.950249+00	2026-06-08 23:21:44.601791+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
3904b720-a650-46ea-bae6-e467eaaf929e	3de93fd0-d667-4116-b29e-7f15ec6990cf	1	2026-06-08 23:21:44.9244+00	2026-06-08 23:21:44.9244+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
2dc8a90e-80cb-463a-80d6-c9eea26f94bf	a8dd1d86-9d44-4d81-9db6-8357ad6f9112	1	2026-06-08 23:21:45.128595+00	2026-06-08 23:21:45.128595+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
e5ad0550-7c13-4451-a4d2-5df9d6e81331	b834a8d4-9ce1-41c9-a43a-2f7de7e7fe50	1	2026-06-08 23:21:45.315123+00	2026-06-08 23:21:45.315123+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
1cfc5851-b453-4745-9f25-195309dd43c4	47f0689d-f2b8-4741-a6ee-faa24f6d6572	1	2026-06-08 23:21:45.500956+00	2026-06-08 23:21:45.500956+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
35a13fb4-5945-4f14-860f-409ce3926ac5	30f09e73-3bfc-4f57-abf5-57eea1cdcd5b	1	2026-06-08 23:21:45.682527+00	2026-06-08 23:21:45.682527+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
0d0b64b6-4f2d-4831-8f94-416e0d431c5d	c6cac533-78ae-477b-9d51-c9fde0b90531	1	2026-06-08 23:21:45.867807+00	2026-06-08 23:21:45.867807+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
41ccf57d-c59f-4ebd-bae9-7fc6c1804008	e7c1149d-0f84-4cca-94ea-d187d85084a4	1	2026-06-08 23:21:46.046515+00	2026-06-08 23:21:46.046515+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
af9c07cd-24a8-4c94-8f10-ecc2f97f82ba	d82e460b-b428-4ae2-92e5-e9bd642035a0	1	2026-06-08 23:21:46.235402+00	2026-06-08 23:21:46.235402+00	0	84f5e844-5448-4c95-b9f1-b9691ad4439c
\.


--
-- Data for Name: estoque_geral; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."estoque_geral" ("id", "produto_id", "quantidade", "created_at") FROM stdin;
fc1f53d3-c812-4718-9af1-ed9cd7c06523	45135aef-586d-436e-931f-2afbac332431	0	2026-05-27 12:56:24.850108+00
edd37bb6-aa38-42e9-b8a6-482ffd49e2a4	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	4889	2026-05-27 05:29:33.146377+00
41833cc1-6bc1-4c6b-94b0-3cf2303d22a7	511a1988-8dd1-419a-84fb-885ca8c7b5fb	0	2026-05-27 04:52:58.272107+00
cfdb4e28-b140-4957-8aab-d0a1fc4b6990	92e5f529-8647-4d13-8d4b-9c7d7d637dbf	0	2026-05-27 04:51:42.029744+00
9fc7d20c-6868-4815-8e97-aba7a1cc724c	3de93fd0-d667-4116-b29e-7f15ec6990cf	0	2026-05-27 04:50:16.660667+00
34212616-8483-4f84-8c34-8fea1f580a8d	a8dd1d86-9d44-4d81-9db6-8357ad6f9112	0	2026-05-27 04:50:24.449958+00
76e4d3ce-9d23-429a-bb67-ac7662aca29c	b834a8d4-9ce1-41c9-a43a-2f7de7e7fe50	0	2026-05-27 04:50:44.065664+00
de713842-8966-464e-bbba-07828914bcec	47f0689d-f2b8-4741-a6ee-faa24f6d6572	0	2026-05-27 04:50:28.816607+00
62c9aac8-ae01-4d24-9f67-0978c91b5dd6	30f09e73-3bfc-4f57-abf5-57eea1cdcd5b	0	2026-05-27 04:50:52.341674+00
1121c345-c9b2-400a-a2cd-3feb4f4dfa00	c6cac533-78ae-477b-9d51-c9fde0b90531	0	2026-05-27 04:51:00.359816+00
b7d2af79-cb47-4912-bc12-928ebf5a0f32	9a4bce9b-e37e-48c7-b308-9d0bf6b1a8ac	0	2026-05-27 04:52:47.922717+00
f323bb9a-0744-4e9d-867e-e0ef1b5b42d3	e7c1149d-0f84-4cca-94ea-d187d85084a4	0	2026-05-27 04:51:07.838789+00
99d4fbfb-faf0-4d76-84c2-2bbe08ff8d36	d82e460b-b428-4ae2-92e5-e9bd642035a0	0	2026-05-27 04:51:16.476744+00
216223cd-c198-4267-a549-7c1f28654288	392bd700-9fb3-4f43-93e0-2906e0ee988d	0	2026-05-27 04:52:41.911628+00
539914d5-c4cd-4c12-8af9-65f706f216ce	29ab07a9-c253-4957-8daa-60c94d88d95c	0	2026-05-27 04:52:00.154175+00
62a4ac06-e66d-49f0-bcf4-f4c1dda0e8d9	17b99158-e8d0-40f9-9160-74e36edac464	0	2026-05-27 04:51:20.984594+00
0df84c97-c661-4525-a4a9-5a96416f09cd	5e700646-38f6-4afb-8c6f-ab33181c9bad	0	2026-05-27 04:51:33.873384+00
ad174854-58a5-404c-9316-993134a2e2b6	1a481517-d82d-401f-9040-d24cbcd2cb98	0	2026-05-27 04:51:29.617705+00
bd448645-3f0a-4fc0-9d9d-6d33a4d8cfbb	a8763c7f-11d3-459f-a102-413aa92dfacd	0	2026-05-27 04:53:18.714206+00
7e53c24e-ee4b-4f05-b177-f3cd5228f30e	19dcc294-2005-4d21-8232-31f0ab4c2d9c	0	2026-05-27 04:53:08.265072+00
b75d9084-f8b5-4be2-ae17-4f2fbe677113	a814e8f8-6640-4f9f-a8ad-f716c51d9165	1	2026-05-27 04:53:14.115437+00
fbd3a40d-0b16-4ee5-aa01-bcd969bbcefb	7bfc7da4-fa1c-43e2-a4f2-974f131f4107	0	2026-05-27 04:53:35.725131+00
0bee55c9-321d-40b5-a42a-a59e9a161949	883d2a0d-4ae8-456d-89f9-ef4a09fc1e0c	0	2026-05-27 04:53:31.343065+00
80fa1c01-aa9e-4eaa-a883-9d6863dbc626	b49505d6-be2a-4dbc-838b-9b6e9968efcb	0	2026-05-27 12:56:31.531245+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."profiles" ("id", "user_id", "display_name", "created_at", "updated_at", "telefone", "ativo") FROM stdin;
5e05e253-19ef-4bc9-8f0f-75d86f519f0d	14022913-5c62-4219-8bcc-e1fa4ecb0ae3	admin@teste.com	2026-05-07 18:01:18.974364+00	2026-05-07 18:01:18.974364+00	\N	t
114a0c4f-8690-4555-9463-ad43bfa8eff7	608bb5f2-fd68-41d3-b0bf-459d07838adb	admin1@teste.com	2026-05-07 18:34:33.283369+00	2026-05-07 18:34:33.283369+00	\N	t
211d7360-4094-4634-bb72-a5bd76f8b1d3	38d0812a-a835-41da-8e50-a5e42d5bee73	Juliana Russo	2026-05-27 05:12:48.000096+00	2026-05-27 05:12:48.246001+00	\N	t
e2cb1e86-d356-4b24-8481-9e492692f6f4	17eca69f-0320-4d26-8fe7-6047107b9201	Fabiana Cirino	2026-06-01 21:25:04.119126+00	2026-06-02 22:41:47.389376+00	\N	t
bc125a69-d413-474e-8c5a-a3c08fe6944d	84f5e844-5448-4c95-b9f1-b9691ad4439c	teste	2026-06-02 23:04:45.009141+00	2026-06-02 23:04:45.25773+00	\N	t
27e6f9cb-38fc-45b6-8a91-93d276eea45d	7151e6b4-838a-43f8-9442-b3b5bc476305	Misma Andreza	2026-06-03 02:39:51.882713+00	2026-06-03 02:39:52.158666+00	\N	t
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."user_roles" ("id", "user_id", "role", "created_at") FROM stdin;
62a4736a-44b5-462f-92b8-be87f55d8f49	14022913-5c62-4219-8bcc-e1fa4ecb0ae3	administrador	2026-05-07 18:23:49.099711+00
edc76c50-563e-4537-9b10-6d3df194ccdd	608bb5f2-fd68-41d3-b0bf-459d07838adb	administrador	2026-05-07 18:37:00.308104+00
87c0e1ed-c3cc-47b3-9a39-747f0b2fc708	38d0812a-a835-41da-8e50-a5e42d5bee73	b2b	2026-05-27 05:12:48.448404+00
3dc071d7-9015-44a5-bfed-d96180ba2f10	17eca69f-0320-4d26-8fe7-6047107b9201	revendedora	2026-06-01 21:25:05.971744+00
7a293675-f3b7-4f86-a574-5657590a7959	84f5e844-5448-4c95-b9f1-b9691ad4439c	revendedora	2026-06-02 23:04:45.466104+00
18237aa7-3ace-49cd-a433-9eb0f9a8c10b	7151e6b4-838a-43f8-9442-b3b5bc476305	b2b	2026-06-03 02:39:52.361468+00
\.


--
-- Data for Name: vendas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."vendas" ("id", "produto_id", "produto_nome", "cliente_nome", "cliente_whatsapp", "data_venda", "codigo_garantia", "validade_garantia", "termo_aceito", "ip_venda", "created_at", "estoque_id", "comissao_percentual", "comissao_valor", "valor_venda", "ciclo_id", "user_id", "pdf_garantia_url", "garantia_uuid") FROM stdin;
5ba58ea5-e599-4325-916a-c958e891b483	\N	Brinco Ponto de Luz	Felipe	(15) 99768-6890	2026-05-22	MN-MPH67EOE	2027-05-22	t	\N	2026-05-22 17:05:18.397296+00	\N	0.00	0.00	59.90	\N	\N	\N	\N
79482ae8-8127-43c1-b69c-26dada1d2ca8	\N	PONTE PRETA DE ITAQUERA	felipe	(15) 99768-6890	2026-05-22	MN-MPH2V7IV	2027-05-22	t	\N	2026-05-22 15:31:49.59906+00	\N	0.00	0.00	20.00	\N	\N	\N	\N
2a3a346f-da3b-4960-a65a-6f9ed42ba3ac	\N	PONTE PRETA DE ITAQUERA	PALMEIRAS MAIOR DE SP	(15) 99765-2045	2026-05-22	MN-MPH2WDQR	2027-05-22	t	\N	2026-05-22 15:32:44.25744+00	\N	0.00	0.00	20.00	\N	\N	\N	\N
f64f2e95-f20f-4d3c-b32e-ec0d6f01499e	\N	PONTE PRETA DE ITAQUERA	Felipe	(15) 99768-6890	2026-05-22	MN-MPH30QWS	2027-05-22	t	\N	2026-05-22 15:36:08.807423+00	\N	0.00	0.00	20.00	\N	\N	\N	\N
6a7c3fc5-90da-49db-85d7-60a6c91546c7	\N	PONTE PRETA DE ITAQUERA	Felipe	(15) 99768-6890	2026-05-22	MN-MPH5M3XN	2027-05-22	t	\N	2026-05-22 16:48:44.803169+00	\N	0.00	0.00	20.00	\N	\N	\N	\N
31416152-ff5b-431e-945f-8a24758d666a	\N	Vai Corinthians	Davi Rosa Gomes	35998912412	2026-05-08	MN-MOWWKQ6B	2027-05-08	t	\N	2026-05-08 12:40:18.694982+00	\N	30.00	4.50	15.00	\N	\N	\N	\N
b221c6fd-eb7f-4888-81d4-c37969f5fb48	\N	Vai Corinthians	Davi Rosa Gomes	(42) 34234-2342	2026-05-19	MN-MPD7MZRU	2027-05-19	t	\N	2026-05-19 22:34:33.789183+00	\N	0.00	0.00	500.00	\N	\N	\N	\N
5510cf92-15cc-418f-ad4b-6e88642ae040	\N	Vai Corinthians	Davi Rosa Gomes	(42) 34234-2342	2026-05-22	MN-MPH9P1E4	2027-05-22	t	\N	2026-05-22 18:42:58.417996+00	\N	0.00	0.00	500.00	\N	\N	\N	\N
cf391e7f-0998-47f8-b9f9-af9b6c948758	\N	Vai Corinthians	Jaqueline Lemes Rosa Gomes	(35) 98418-8165	2026-05-16	MN-MP8QX5E5	2027-05-16	t	\N	2026-05-16 19:35:25.537032+00	\N	30.00	150.00	500.00	c67393b7-771a-4457-b30b-9675ef286ede	608bb5f2-fd68-41d3-b0bf-459d07838adb	\N	\N
99e6368e-3236-4a3b-b1b9-f71721cff8a6	\N	Vai Corinthians	Jaqueline Lemes Rosa Gomes	(35) 98418-8165	2026-05-16	MN-MP8SAYHZ	2027-05-16	t	\N	2026-05-16 20:14:08.794306+00	\N	30.00	150.00	500.00	c67393b7-771a-4457-b30b-9675ef286ede	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/99e6368e-3236-4a3b-b1b9-f71721cff8a6.pdf	\N
3aa51710-6fb4-4bbe-b0ef-0a4e1dd71a7e	\N	Vai Corinthians	Jaqueline Lemes Rosa Gomes	(35) 98418-8165	2026-05-16	MN-MP8TF5KU	2027-05-16	t	\N	2026-05-16 20:45:23.889723+00	\N	30.00	150.00	500.00	c67393b7-771a-4457-b30b-9675ef286ede	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/3aa51710-6fb4-4bbe-b0ef-0a4e1dd71a7e.pdf	\N
2ea01cb3-ed21-4b97-9d87-bf62c17fee2c	\N	Vai Corinthians	TEstedasd	(32) 13123-1231	2026-05-19	MN-MPD7TNIN	2027-05-19	t	\N	2026-05-19 22:39:44.770921+00	\N	0.00	0.00	500.00	c67393b7-771a-4457-b30b-9675ef286ede	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/2ea01cb3-ed21-4b97-9d87-bf62c17fee2c.pdf	\N
e4bee822-48e5-4147-ac96-804740945ab2	\N	Brico Pérola	Erica Coelho	(15) 99769-0365	2026-05-22	MN-MPH6DIAY	2027-05-22	t	\N	2026-05-22 17:10:03.080576+00	\N	0.00	0.00	39.90	\N	\N	\N	\N
7677272d-edeb-460a-b7a8-a036c08349ab	\N	Vai Corinthians	rqwereqrqwe	(35) 32132-1312	2026-05-19	MN-MPD7X6F4	2027-05-19	t	\N	2026-05-19 22:42:28.896625+00	\N	0.00	0.00	500.00	c67393b7-771a-4457-b30b-9675ef286ede	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/7677272d-edeb-460a-b7a8-a036c08349ab.pdf	\N
9224ec56-5c73-47bf-abf1-f79d34926fe5	\N	Vai Corinthians	Felipe Grillo Lopes	(15) 99768-6890	2026-05-22	MN-MPH09SPR	2027-05-22	t	\N	2026-05-22 14:19:11.913392+00	\N	0.00	0.00	500.00	c67393b7-771a-4457-b30b-9675ef286ede	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/9224ec56-5c73-47bf-abf1-f79d34926fe5.pdf	\N
aef7959f-7de9-4ca0-b5af-478c3b64d0b7	\N	Vai Corinthians	Marco	(35) 99914-8740	2026-05-22	MN-MPH1EO74	2027-05-22	t	\N	2026-05-22 14:50:59.320728+00	\N	0.00	0.00	500.00	c67393b7-771a-4457-b30b-9675ef286ede	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/aef7959f-7de9-4ca0-b5af-478c3b64d0b7.pdf	\N
5faa04b4-27e2-4f80-a454-d4c7d5d2205c	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Davi Rosa Gomes	(35) 99891-2412	2026-05-27	MN-MPONKUFN	2027-05-27	t	\N	2026-05-27 22:46:27.588737+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/5faa04b4-27e2-4f80-a454-d4c7d5d2205c.pdf	6c6f23b5-cdd1-42bf-879d-a1da9af15e19
93c25710-9030-4e0e-8d1b-1e113870fd03	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Davi Rosa Gomes	(35) 99891-2412	2026-05-27	MN-MPONLSZ7	2027-05-27	t	\N	2026-05-27 22:47:12.327873+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/93c25710-9030-4e0e-8d1b-1e113870fd03.pdf	4ff933cf-b252-4741-bd15-e4303e948882
948654dc-8edc-4622-9487-f641415d0543	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Davi Rosa Gomes	(35) 99891-2412	2026-05-27	MN-MPONV425	2027-05-27	t	\N	2026-05-27 22:54:26.616+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/948654dc-8edc-4622-9487-f641415d0543.pdf	b5b550b0-70e8-4939-be3b-c9f53d53d275
1d1499b2-5d05-403e-81de-590336683dfb	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Davi Rosa Gomes	(35) 99891-2412	2026-05-27	MN-MPONWJLR	2027-05-27	t	\N	2026-05-27 22:55:33.807397+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/1d1499b2-5d05-403e-81de-590336683dfb.pdf	5af69126-f1e1-4853-a1a9-d2a01913cd55
171d4f93-fde0-4c7c-a10a-568cc39147f0	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Davi Rosa Gomes	(35) 99891-2412	2026-05-27	MN-MPOO664G	2027-05-27	t	\N	2026-05-27 23:03:02.446307+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/171d4f93-fde0-4c7c-a10a-568cc39147f0.pdf	5732e4af-2f6d-40f6-a6db-78b8ac931cca
907ec463-2fd9-4ab5-a0ea-8a344c42ab39	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Davi Rosa Gomes	(35) 99891-2412	2026-05-27	MN-MPOOA6LP	2027-05-27	t	\N	2026-05-27 23:06:09.682519+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/907ec463-2fd9-4ab5-a0ea-8a344c42ab39.pdf	339d9f52-6fb7-4892-9943-0b6c777b1b0d
6c140c11-eaae-4e60-a144-69c8b1e8a74a	7bfc7da4-fa1c-43e2-a4f2-974f131f4107	Pulseiras Zircônia Ovais Cristal Com Cartier – Banhado a Prata	Nati	(43) 99158-4514	2026-05-29	MN-MPQ73Z0P	2027-05-29	t	\N	2026-05-29 00:40:32.440041+00	11b4af7f-1628-45fa-902b-168cddca6bec	0.00	0.00	85.90	cc034ec3-5311-4264-837b-387ef52bcd15	38d0812a-a835-41da-8e50-a5e42d5bee73	\N	\N
85ebaabf-8cd4-444e-b1c6-83f93687e88c	3de93fd0-d667-4116-b29e-7f15ec6990cf	Brinco Triângulo Torcido – Banhado a Ouro 18K	Stephany	(35) 98461-6655	2026-05-29	MN-MPR4G0WK	2027-05-29	t	\N	2026-05-29 16:13:41.130296+00	288cbab1-477a-4bdf-b728-08ff84ad68ad	0.00	0.00	79.90	cc034ec3-5311-4264-837b-387ef52bcd15	38d0812a-a835-41da-8e50-a5e42d5bee73	\N	7c984415-f2f6-4523-9f0a-99185eaa583d
143b3a9a-15d3-4fb8-8ee4-d0175c3d7225	45135aef-586d-436e-931f-2afbac332431	Pulseira Corrente Piastrine – Banhado a Ouro 18K	Cíntia	(35) 98837-0293	2026-05-29	MN-MPRJ6MMN	2027-05-29	t	\N	2026-05-29 23:06:17.19581+00	0dc18aa3-06a1-45cc-a7eb-788fa4a1662f	0.00	0.00	69.90	cc034ec3-5311-4264-837b-387ef52bcd15	38d0812a-a835-41da-8e50-a5e42d5bee73	\N	a47b36d9-70fb-4ed9-a858-11eb29904c17
95057b1c-0d1b-4edd-8a23-a6b29fff21fa	19dcc294-2005-4d21-8232-31f0ab4c2d9c	Pulseira Elos Dourada – Banhado a Ouro 18K	Mãe	(15) 99867-3440	2026-05-30	MN-MPSK6ERI	2027-05-30	t	\N	2026-05-30 16:21:53.981627+00	bfd9506f-b6fe-4c45-bbaf-edb8b0d7e45f	0.00	0.00	84.90	cc034ec3-5311-4264-837b-387ef52bcd15	38d0812a-a835-41da-8e50-a5e42d5bee73	\N	7a9ed543-c496-4d57-b38d-e7178b03d343
b631ca6b-f35a-4982-a633-e05d7282c0e3	\N	BRINCO GOTA	ERIKA	(15) 99769-0365	2026-05-22	MN-MPIGFVB5	2027-05-22	t	\N	2026-05-23 14:39:32.704706+00	\N	0.00	0.00	50.00	\N	\N	\N	\N
5259a066-6b5c-4ca0-9ec9-ddeb1653d1be	\N	BRINCO GOTA	ERIKA	(15) 99769-0365	2026-05-23	MN-MPIGOTKH	2027-05-23	t	\N	2026-05-23 14:46:30.54267+00	\N	0.00	0.00	50.00	\N	\N	\N	\N
87d2d6dc-f7f6-4266-98e1-930215baa828	\N	BRINCO GOTA	cintia	(15) 99768-6890	2026-05-23	MN-MPII0H5E	2027-05-23	t	\N	2026-05-23 15:23:33.809225+00	\N	0.00	0.00	50.00	\N	\N	\N	\N
6e344aa6-3e13-49ec-a948-017f3d353123	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Felipe	(15) 99768-6890	2026-06-03	MN-MPY68I0R	2027-06-03	t	\N	2026-06-03 14:38:12.543541+00	fbd67e38-9b64-4e4d-85be-d192e88a38d2	0.00	0.00	0.01	4e48a5b5-b43e-485c-b691-f6e58d2aba7c	7151e6b4-838a-43f8-9442-b3b5bc476305	\N	ab183845-50ed-4167-ae2f-f6ec0a1821f3
baeef3aa-e623-44f6-b147-ff102af9ea62	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Alexandre	(15) 99154-8631	2026-06-03	MN-MPY6EMY9	2027-06-03	t	\N	2026-06-03 14:42:59.219686+00	fbd67e38-9b64-4e4d-85be-d192e88a38d2	0.00	0.00	0.01	4e48a5b5-b43e-485c-b691-f6e58d2aba7c	7151e6b4-838a-43f8-9442-b3b5bc476305	\N	d707d240-e6aa-4990-baa2-947987ed1c16
c9290c68-9694-4be1-8186-1b62a4ae1ca1	\N	BRINCO PALMEIRAS	ENDRICK	(15) 99768-6890	2026-05-23	MN-MPIHDFYE	2027-05-23	t	\N	2026-05-23 15:05:38.95951+00	\N	0.00	0.00	10000.00	\N	\N	\N	\N
b99f3aa3-d241-4233-854e-4ed165bc531e	511a1988-8dd1-419a-84fb-885ca8c7b5fb	Brinco Coração Cravejado Multicolor - Banhado a Prata	Jacqueline	(35) 99864-3440	2026-05-30	MN-MPSK9P75	2027-05-30	t	\N	2026-05-30 16:24:27.157058+00	df603895-e28b-4d3f-83a0-a3d602ead357	0.00	0.00	59.90	cc034ec3-5311-4264-837b-387ef52bcd15	38d0812a-a835-41da-8e50-a5e42d5bee73	\N	6be6ac53-a19c-4121-935f-ffc15454a9c2
6ed83541-bf40-4784-a088-38f2463fe551	\N	BRINCO GOTA	felipe	(15) 99768-6890	2026-05-26	MN-MPLXWHA2	2027-05-26	t	\N	2026-05-26 01:11:40.527093+00	\N	0.00	0.00	50.00	\N	\N	\N	\N
f0e07eb0-9cb1-4f78-886e-68967fecc090	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Felipe	(15) 99768-6890	2026-05-27	MN-MPNMPROS	2027-05-27	t	\N	2026-05-27 05:34:04.531265+00	012df210-b2ca-45da-9a99-105d81c00488	0.00	0.00	0.01	cc034ec3-5311-4264-837b-387ef52bcd15	38d0812a-a835-41da-8e50-a5e42d5bee73	\N	\N
19d4a8a5-388d-4dfc-bf93-df9eb4133288	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Fe	(15) 98102-5579	2026-05-27	MN-MPO8XSOC	2027-05-27	t	\N	2026-05-27 15:56:11.232297+00	012df210-b2ca-45da-9a99-105d81c00488	0.00	0.00	0.01	cc034ec3-5311-4264-837b-387ef52bcd15	38d0812a-a835-41da-8e50-a5e42d5bee73	\N	\N
3abc0afd-f6fc-44e2-8e56-76a626be2bbd	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Davi Rosa Gomes	(35) 99891-2412	2026-05-27	MN-MPONECLF	2027-05-27	t	\N	2026-05-27 22:41:24.552274+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/3abc0afd-f6fc-44e2-8e56-76a626be2bbd.pdf	80490064-fcf6-4ebd-9801-a1ce1624edf2
35066e65-f86d-4e55-895e-5eb40cb36034	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	TESTE	(35) 99891-2512	2026-05-30	MN-MPSL7J99	2027-05-30	t	\N	2026-05-30 16:51:16.865111+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/35066e65-f86d-4e55-895e-5eb40cb36034.pdf	13f0ee0a-810c-4b91-b16f-9ddde547e9a9
c7409059-f266-4cab-ac0f-0c5f85dd9a3a	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	TESTESS	(31) 23123-4123	2026-05-30	MN-MPSL9G9T	2027-05-30	t	\N	2026-05-30 16:52:46.266262+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/c7409059-f266-4cab-ac0f-0c5f85dd9a3a.pdf	cc71eca4-c08e-4fe4-a72d-c45d8e7222d1
3a9ef106-d3d3-45c1-8ddf-ec00102e7709	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	23123123123	(31) 23123-1231	2026-05-30	MN-MPSLDO7K	2027-05-30	t	\N	2026-05-30 16:56:03.161413+00	32c92ca0-55c0-4465-be9b-9cf4f658331d	0.00	0.00	0.01	731c2914-0d88-41b0-bd67-34fbeb73c00f	608bb5f2-fd68-41d3-b0bf-459d07838adb	https://tybuxoxugidepqyxjfem.supabase.co/storage/v1/object/public/certificados/3a9ef106-d3d3-45c1-8ddf-ec00102e7709.pdf	f4d2063c-88b0-4834-a5e6-e656e321425f
a34d9327-2bd5-4f8b-9b8c-96b798aba2bf	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Monare	(15) 99768-6890	2026-06-02	MN-MPX8P8DW	2027-06-02	t	\N	2026-06-02 22:59:26.432479+00	82ff8f20-2531-4300-a350-3f2ccf11853b	0.00	0.00	0.01	f779398d-c9cb-45d4-a6da-a96663ff6ad9	17eca69f-0320-4d26-8fe7-6047107b9201	\N	837728c3-5c25-45ca-b17e-a0bea1ee9067
a992130e-3363-44a6-a2b1-4d6dc3f448cf	3f4a9ab5-1711-46d0-96da-fd8911be5b2f	VENDA  TESTE	Amanda	(15) 99633-8541	2026-06-03	MN-MPYCMPSF	2027-06-03	t	\N	2026-06-03 17:37:15.253191+00	012df210-b2ca-45da-9a99-105d81c00488	0.00	0.00	0.01	cc034ec3-5311-4264-837b-387ef52bcd15	38d0812a-a835-41da-8e50-a5e42d5bee73	\N	e0e97e35-1396-4ce3-8fca-3501add2d8ec
3883d9b5-b71f-4b25-8bc2-a187618d3309	\N	BRINCO GOTA	Monarê	(15) 99633-8541	2026-05-26	MN-MPM3PCVG	2027-05-26	t	\N	2026-05-26 03:54:08.624884+00	\N	0.00	0.00	50.00	\N	\N	\N	\N
abf9ce67-7653-464f-adf7-15e61fe0cc63	\N	BRINCO GOTA	Monarê	(15) 99633-8541	2026-05-26	MN-MPM3UD5L	2027-05-26	t	\N	2026-05-26 03:58:02.269206+00	\N	0.00	0.00	50.00	\N	\N	\N	\N
dacda12b-7382-49cf-9e5a-1de1faf0e540	392bd700-9fb3-4f43-93e0-2906e0ee988d	Brinco Argola Abaulado – Banhado a Prata	Nati	(43) 99158-4514	2026-06-04	MN-MPZT03OI	2027-06-04	t	\N	2026-06-04 18:03:20.119545+00	9119c0dc-3720-4fb9-8c10-5354a7b901a6	0.00	0.00	74.90	cc034ec3-5311-4264-837b-387ef52bcd15	38d0812a-a835-41da-8e50-a5e42d5bee73	\N	96216633-e0eb-4d79-a1a3-9cfe86dfa0d9
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 209, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict Qzsuq7eAdCAHuL6Jy2bdVTOBTpHn4c3nLycUkYO16rybh3d4kyRqH9EVvoTPgQv

RESET ALL;
