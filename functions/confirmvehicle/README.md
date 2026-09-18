# confirmvehicle

Mover-callable function (identity from `x-appwrite-user-id`) for rental drivers' SAME-vehicle confirmation at service-day login and after a completed move. Stamps `vehicleConfirmedAt` / `vehicleConfirmedServiceDate` (calendar date in `PLATFORM_TZ`), clears `vehicleReconfirmRequired`, and appends a `confirmed_same` row to `vehicle_events`. Contract: `pickltmobile/.agent/plans/vehicles/0.master.md` §6.2. Owner repo: pickltmover; the copies in pickltmobile and pickLT are byte-identical reference mirrors.
