const { z } = require("zod");

const commodityEnum = z.enum(["GOLD", "SILVER", "PLATINUM", "DIAMOND"]);
const roleEnum = z.enum(["admin", "secretary", "associate_director"]);
const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z
  .string()
  .trim()
  .regex(objectIdRegex, "id must be a valid Mongo ObjectId");

const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/\d/, "Password must include a number")
  .regex(/[^A-Za-z\d]/, "Password must include a special character");

const tenantSlugSchema = z.string().trim().min(2).max(64).optional();

const createEntitySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    phone: z.string().trim().max(30).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().trim().email("Valid email is required"),
    password: strongPasswordSchema,
    role: roleEnum,
    tenantSlug: tenantSlugSchema,
  }),
});

const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Valid email is required"),
    token: z.string().trim().min(6, "Verification token is required"),
    tenantSlug: tenantSlugSchema,
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Valid email is required"),
    password: z.string().min(1, "Password is required"),
    tenantSlug: tenantSlugSchema,
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10, "refreshToken is required"),
  }),
});

const updateEntitySchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
      phone: z.string().trim().max(30).optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required for update",
    }),
});

const entityIdParamSchema = z.object({
  params: z.object({
    entityId: objectIdSchema,
  }),
});

const createPartnerLedgerSchema = z.object({
  params: z.object({
    entityId: objectIdSchema,
  }),
  body: z
    .object({
      recordedAt: z.coerce.date(),
      moneyInvested: z.coerce.number().min(0).optional(),
      moneyReceived: z.coerce.number().min(0).optional(),
    })
    .refine(
      (value) =>
        (Number(value.moneyInvested) || 0) > 0 || (Number(value.moneyReceived) || 0) > 0,
      { message: "Enter money invested and/or money received (at least one must be greater than 0)" }
    ),
});

const deletePartnerLedgerSchema = z.object({
  params: z.object({
    entityId: objectIdSchema,
    entryId: objectIdSchema,
  }),
});

const createDealSchema = z.object({
  body: z.object({
    entityId: objectIdSchema,
    commodity: commodityEnum,
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    spotPrice: z.coerce.number().positive("Spot price must be greater than 0"),
    paidAmount: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

const updateDealSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      entityId: objectIdSchema.optional(),
      commodity: commodityEnum.optional(),
      quantity: z.coerce.number().positive("Quantity must be greater than 0").optional(),
      spotPrice: z.coerce.number().positive("Spot price must be greater than 0").optional(),
      paidAmount: z.coerce.number().min(0).optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required for update",
    }),
});

const idParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

const purchaseStatusEnum = z.enum(["pending", "paid"]);

const createPurchaseSchema = z.object({
  body: z.object({
    purchaseDate: z.coerce.date(),
    buyingPrice: z.coerce.number().min(0, "Buying price cannot be negative"),
    weightCarat: z.coerce.number().positive("Weight (carat) must be greater than 0"),
    clientName: z.string().trim().min(2, "Client name must be at least 2 characters"),
    clientContact: z.string().trim().min(3, "Client contact is required"),
    status: purchaseStatusEnum.optional(),
    amountReceived: z.coerce.number().min(0).optional(),
  }),
});

const updatePurchaseSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      purchaseDate: z.coerce.date().optional(),
      buyingPrice: z.coerce.number().min(0, "Buying price cannot be negative").optional(),
      weightCarat: z.coerce.number().positive("Weight (carat) must be greater than 0").optional(),
      clientName: z.string().trim().min(2, "Client name must be at least 2 characters").optional(),
      clientContact: z.string().trim().min(3, "Client contact is required").optional(),
      status: purchaseStatusEnum.optional(),
      amountReceived: z.coerce.number().min(0).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required for update",
    }),
});

const weightUnitEnum = z.enum(["gram", "carat"]);

const createSaleSchema = z.object({
  body: z.object({
    saleDate: z.coerce.date(),
    buyerName: z.string().trim().min(2, "Buyer name must be at least 2 characters"),
    buyerContact: z.string().trim().min(3, "Buyer contact is required"),
    weight: z.coerce.number().positive("Weight must be greater than 0"),
    weightUnit: weightUnitEnum,
    sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative"),
    amountReceived: z.coerce.number().min(0).optional(),
  }),
});

const updateSaleSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      saleDate: z.coerce.date().optional(),
      buyerName: z.string().trim().min(2, "Buyer name must be at least 2 characters").optional(),
      buyerContact: z.string().trim().min(3, "Buyer contact is required").optional(),
      weight: z.coerce.number().positive("Weight must be greater than 0").optional(),
      weightUnit: weightUnitEnum.optional(),
      sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative").optional(),
      amountReceived: z.coerce.number().min(0).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required for update",
    }),
});

const optionalQueryDate = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  return val;
}, z.coerce.date().optional());

const reportsQuerySchema = z.object({
  query: z.object({
    from: optionalQueryDate,
    to: optionalQueryDate,
  }),
});

const createBorrowSchema = z.object({
  body: z.object({
    borrowerName: z.string().trim().min(2, "Name must be at least 2 characters"),
    borrowerContact: z.string().trim().min(3, "Contact is required"),
    borrowedAt: z.coerce.date(),
    principalAmount: z.coerce.number().positive("Amount borrowed must be greater than 0"),
    amountPaid: z.coerce.number().min(0).optional(),
  }),
});

const updateBorrowBodySchema = z
  .object({
    borrowerName: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
    borrowerContact: z.string().trim().min(3, "Contact is required").optional(),
    borrowedAt: z.coerce.date().optional(),
    principalAmount: z.coerce.number().positive("Amount borrowed must be greater than 0").optional(),
    amountPaid: z.coerce.number().min(0).optional(),
    additionalPayment: z.coerce.number().positive("Additional payment must be greater than 0").optional(),
  })
  .refine(
    (v) =>
      [
        v.borrowerName,
        v.borrowerContact,
        v.borrowedAt,
        v.principalAmount,
        v.amountPaid,
        v.additionalPayment,
      ].some((x) => x !== undefined),
    { message: "At least one field is required for update" }
  )
  .refine((v) => !(v.amountPaid !== undefined && v.additionalPayment !== undefined), {
    message: "Use either amountPaid (total so far) or additionalPayment (add to paid), not both",
  });

const updateBorrowSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: updateBorrowBodySchema,
});

const phoneRegisterRequestSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
    phone: z.string().trim().min(8, "Phone number is required"),
    role: roleEnum,
  }),
});

const phoneRegisterVerifySchema = z.object({
  body: z.object({
    phone: z.string().trim().min(8, "Phone number is required"),
    code: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
  }),
});

const phoneLoginRequestSchema = z.object({
  body: z.object({
    phone: z.string().trim().min(8, "Phone number is required"),
  }),
});

const phoneLoginVerifySchema = phoneRegisterVerifySchema;

const vaultDepositSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    note: z.string().trim().max(200).optional(),
  }),
});

module.exports = {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  refreshSchema,
  createEntitySchema,
  updateEntitySchema,
  entityIdParamSchema,
  createPartnerLedgerSchema,
  deletePartnerLedgerSchema,
  createDealSchema,
  updateDealSchema,
  createPurchaseSchema,
  updatePurchaseSchema,
  createSaleSchema,
  updateSaleSchema,
  reportsQuerySchema,
  createBorrowSchema,
  updateBorrowSchema,
  idParamSchema,
  phoneRegisterRequestSchema,
  phoneRegisterVerifySchema,
  phoneLoginRequestSchema,
  phoneLoginVerifySchema,
  vaultDepositSchema,
};
