# Security Specification - QUE POLLO

## Data Invariants
1. **Authentication**: All read/write operations (except potentially public branding) require a valid authenticated session.
2. **Admin Authority**: ONLY verified administrators (defined by email or role document) can modify critical configurations (`empresa`) and personnel data (`empleados`).
3. **Relational Integrity**: `detalle_ventas` and `detalle_compras` MUST reference an existing parent transaction.
4. **Physical Reality**: Stock quantities and prices MUST be non-negative numbers.
5. **Traceability**: All transactions MUST record a `fecha` (server-side validated if possible).
6. **Immutable Origins**: Once a transaction (`venta`, `compra`) is created, its `fecha` and `tipoPago` should remain immutable to prevent audit tampering.

## The Dirty Dozen (Attack Payloads)

1. **The Ghost Product**: `create` product with no `nombre` or `unidad`. Expected: `PERMISSION_DENIED`.
2. **The Negative Stock**: `create` product with `stock: -100`. Expected: `PERMISSION_DENIED`.
3. **The Privilege Escalation**: Non-admin user tries to update `empresa/config` to change `consecutivoVenta`. Expected: `PERMISSION_DENIED`.
4. **The Shadow Field Attack**: `create` product with an extra field `isVerified: true` not in schema. Expected: `PERMISSION_DENIED`.
5. **The ID Poisoning**: `create` product with ID `a`.repeat(2000). Expected: `PERMISSION_DENIED`.
6. **The Orphaned Detail**: `create` `detalle_venta` with an ID that doesn't exist in `ventas`. Expected: `PERMISSION_DENIED`.
7. **The Price Manipulation**: `update` product `precio` to -50. Expected: `PERMISSION_DENIED`.
8. **The Identity Spoof**: Authenticated user tries to delete a `venta` they didn't create (and aren't admin). Expected: `PERMISSION_DENIED`.
9. **The Transaction Bypass**: Directly updating stock on `productos` without a corresponding `ajuste` or transaction record (this might be hard to enforce purely in rules if we allow stock updates, but we should restrict who can do direct updates).
10. **The Temporal Warp**: `create` a `venta` with a `fecha` 10 years in the future. Expected: `PERMISSION_DENIED` (if using server timestamps).
11. **The Broken Enum**: `create` a `caja` entry with `tipo: "robo"`. Expected: `PERMISSION_DENIED`.
12. **The Type Confusion**: `create` a `venta` where `total` is a string `"100"` instead of a number. Expected: `PERMISSION_DENIED`.

## Implementation Strategy
- Use `isValid[Entity]` helpers for EVERY write.
- Enforce strict keys using `.keys().hasAll(...)` and `.keys().size() == N`.
- Use `affectedKeys().hasOnly(...)` for updates.
- Verify parent existence using `exists()`.
