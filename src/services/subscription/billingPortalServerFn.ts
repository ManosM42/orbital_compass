import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const portalInputSchema = z.object({
  accessToken: z.string().min(1),
});

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string }) => portalInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { createBillingPortalSessionImpl } = await import(
      "@/server/billingPortalImpl.server"
    );
    return createBillingPortalSessionImpl(data);
  });
