// ============================================================================
// SUPPLIER/VENDOR SWAGGER DOCUMENTATION
// OpenAPI/Swagger schema definitions for Supplier and Vendor endpoints
// ============================================================================

/**
 * @swagger
 * tags:
 *   name: Admin | Suppliers
 *   description: 🔐 Admin – Manage suppliers and vendors for expense tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SupplierLocal:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         supplier_id:
 *           type: string
 *           example: "SUP-00001"
 *         supplier_name:
 *           type: string
 *           example: "ABC Supplies Inc."
 *         contact_number:
 *           type: string
 *         email:
 *           type: string
 *         street:
 *           type: string
 *         barangay:
 *           type: string
 *         city:
 *           type: string
 *         province:
 *           type: string
 *         status:
 *           type: string
 *           example: "ACTIVE"
 *         is_active:
 *           type: boolean
 *         last_synced_at:
 *           type: string
 *           format: date-time
 *         vendor:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *
 *     VendorListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         code:
 *           type: string
 *           example: "SUP-00001"
 *         name:
 *           type: string
 *           example: "ABC Supplies Inc."
 *         isSupplier:
 *           type: boolean
 *           example: true
 *         supplier_local_id:
 *           type: integer
 *           nullable: true
 *
 *     CreateVendorDTO:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "Local Vendor Corp"
 *
 *     SupplierWebhookPayload:
 *       type: object
 *       required:
 *         - supplier_id
 *         - supplier_name
 *       properties:
 *         supplier_id:
 *           type: string
 *           example: "SUP-001"
 *         supplier_name:
 *           type: string
 *           example: "ABC Supplies Inc."
 *         contact_number:
 *           type: string
 *         email:
 *           type: string
 *         street:
 *           type: string
 *         barangay:
 *           type: string
 *         city:
 *           type: string
 *         province:
 *           type: string
 *         status:
 *           type: string
 *           example: "ACTIVE"
 *         isdeleted:
 *           type: boolean
 *           example: false
 */

/**
 * @swagger
 * /api/v1/admin/suppliers:
 *   get:
 *     summary: Get all suppliers
 *     description: Retrieve all suppliers synced from Inventory system
 *     tags:
 *       - Admin | Suppliers
 *     responses:
 *       200:
 *         description: Suppliers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SupplierLocal'
 *
 *   post:
 *     summary: Webhook - Create/update supplier
 *     description: Receive supplier data from Inventory system webhook
 *     tags:
 *       - Admin | Suppliers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupplierWebhookPayload'
 *     responses:
 *       200:
 *         description: Supplier created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     supplier_local_id:
 *                       type: integer
 *                     vendor_id:
 *                       type: integer
 *       400:
 *         description: Invalid request or duplicate name
 */

/**
 * @swagger
 * /api/v1/admin/suppliers/vendors:
 *   get:
 *     summary: Get vendor list for dropdown
 *     description: |
 *       Get unified list of vendors for expense tracking.
 *       Returns both supplier-linked vendors and standalone vendors.
 *     tags:
 *       - Admin | Suppliers
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VendorListItem'
 *
 *   post:
 *     summary: Create standalone vendor
 *     description: Create a vendor not linked to any Inventory supplier
 *     tags:
 *       - Admin | Suppliers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVendorDTO'
 *     responses:
 *       200:
 *         description: Vendor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     code:
 *                       type: string
 *                       example: "VDR-00001"
 *                     name:
 *                       type: string
 *       400:
 *         description: Duplicate name or invalid request
 */

/**
 * @swagger
 * /api/v1/admin/suppliers/sync:
 *   post:
 *     summary: Sync suppliers from Inventory
 *     description: |
 *       Fetch all suppliers from Inventory API and sync to local database.
 *       Creates/updates supplier_local records and corresponding vendor records.
 *       This runs automatically on server startup but can be triggered manually.
 *     tags:
 *       - Admin | Suppliers
 *     responses:
 *       200:
 *         description: Sync completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Synced 10 suppliers"
 *                 data:
 *                   type: object
 *                   properties:
 *                     synced:
 *                       type: integer
 *                       example: 10
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *       500:
 *         description: Sync failed
 */

export { };
