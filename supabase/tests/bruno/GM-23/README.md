# GM-23 Bruno collection

This collection exercises the real inbox and device RPC boundary against an
owned disposable PostgREST runtime. Use real guest JWTs from the GM-23 runner;
never paste an Expo token, service-role key, or production identity into the
collection. The sender's remote Expo delivery is a separate transport check.

Expected outputs are exact: inbox `200` with at most 50 typed items, register
and unregister `200` with `{ok:true,data:null}`, and missing authentication
`401/AUTH_REQUIRED`. Denied or provisional permission keeps inbox usable and
does not create an active delivery.
